import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import {
  applyAssessmentRetention,
  buildAssessmentRetentionPlan,
} from "./assessment-retention.js";

const attempt = (
  id: string,
  userId: string,
  submittedAt: string,
  hasDetail = true,
) => ({
  id,
  userId,
  status: "SUBMITTED" as const,
  createdAt: new Date(submittedAt),
  submittedAt: new Date(submittedAt),
  hasDetail,
});

describe("assessment retention", () => {
  const retentionScope = {
    assessmentId: "00000000-0000-4000-8000-000000000001",
    assessmentSlug: "geo-foundations",
  };

  it("uses the most recent effective attempt before redacting all personal detail", () => {
    const plan = buildAssessmentRetentionPlan(
      [
        attempt("a1", "u1", "2025-01-01T00:00:00.000Z"),
        attempt("a2", "u1", "2026-02-01T00:00:00.000Z"),
        attempt("b1", "u2", "2025-06-01T00:00:00.000Z"),
      ],
      {
        ...retentionScope,
        asOf: new Date("2026-08-03T00:00:00.000Z"),
        detailMonths: 12,
        summaryMonths: 24,
      },
    );
    expect(plan.redactDetailAttemptIds).toEqual(["b1"]);
    expect(plan.deleteSummaryAttemptIds).toEqual([]);
    expect(plan.targetDigest).toMatch(/^[0-9a-f]{64}$/);
  });

  it("deletes expired summaries once and excludes them from detail work", () => {
    const plan = buildAssessmentRetentionPlan(
      [attempt("a1", "u1", "2024-01-01T00:00:00.000Z")],
      {
        ...retentionScope,
        asOf: new Date("2026-08-03T00:00:00.000Z"),
        detailMonths: 12,
        summaryMonths: 24,
      },
    );
    expect(plan.redactDetailAttemptIds).toEqual([]);
    expect(plan.deleteSummaryAttemptIds).toEqual(["a1"]);
  });

  it("rejects an unsafe retention window", () => {
    expect(() =>
      buildAssessmentRetentionPlan([], {
        ...retentionScope,
        asOf: new Date("2026-08-03T00:00:00.000Z"),
        detailMonths: 24,
        summaryMonths: 12,
      }),
    ).toThrow("保留月数");
  });

  it("binds the digest to action classes and retention boundaries", () => {
    const attempts = [
      attempt("a", "u1", "2025-01-01T00:00:00.000Z"),
      attempt("b", "u2", "2024-01-01T00:00:00.000Z"),
    ];
    const preview = buildAssessmentRetentionPlan(attempts, {
      ...retentionScope,
      asOf: new Date("2026-08-03T00:00:00.000Z"),
      detailMonths: 12,
      summaryMonths: 24,
    });
    const laterApply = buildAssessmentRetentionPlan(attempts, {
      ...retentionScope,
      asOf: new Date("2027-08-03T00:00:00.000Z"),
      detailMonths: 12,
      summaryMonths: 24,
    });

    expect(preview.redactDetailAttemptIds).toEqual(["a"]);
    expect(preview.deleteSummaryAttemptIds).toEqual(["b"]);
    expect(laterApply.redactDetailAttemptIds).toEqual([]);
    expect(laterApply.deleteSummaryAttemptIds).toEqual(["a", "b"]);
    expect(preview.targetDigest).not.toBe(laterApply.targetDigest);
  });

  it("binds apply mode to the preview digest before deleting data", async () => {
    const deleteMany = vi.fn();
    const tx = {
      $executeRaw: vi.fn(),
      assessment: {
        findUnique: vi.fn().mockResolvedValue({ slug: "geo-foundations" }),
      },
      assessmentAttempt: { findMany: vi.fn().mockResolvedValue([]) },
      assessmentAnswer: { deleteMany },
      assessmentReport: { updateMany: vi.fn(), deleteMany: vi.fn() },
      assessmentOverride: { deleteMany: vi.fn() },
      auditLog: { deleteMany: vi.fn(), create: vi.fn() },
    };
    const prisma = {
      $transaction: (operation: (client: typeof tx) => unknown) =>
        operation(tx),
    } as unknown as PrismaClient;

    await expect(
      applyAssessmentRetention(prisma, {
        assessmentId: "00000000-0000-4000-8000-000000000001",
        assessmentSlug: "geo-foundations",
        asOf: new Date("2026-08-03T00:00:00.000Z"),
        detailMonths: 12,
        summaryMonths: 24,
        expectedDigest: "0".repeat(64),
        maxTargets: 0,
      }),
    ).rejects.toThrow("预览摘要不一致");
    expect(deleteMany).not.toHaveBeenCalled();
  });
});
