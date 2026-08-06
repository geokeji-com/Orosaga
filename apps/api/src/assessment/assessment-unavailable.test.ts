import { NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { PrismaService } from "../prisma/prisma.service.js";
import { AssessmentService } from "./assessment.service.js";

function serviceWithoutAssessment() {
  return new AssessmentService({
    assessmentPilotParticipant: { findFirst: vi.fn().mockResolvedValue(null) },
    assessment: { findUnique: vi.fn().mockResolvedValue(null) },
  } as unknown as PrismaService);
}

describe("assessment availability before a formal pack is imported", () => {
  it("returns an explicit unavailable overview for the planned GEO assessment", async () => {
    await expect(
      serviceWithoutAssessment().overview("geo-foundations", "user-1"),
    ).resolves.toMatchObject({
      assessmentSlug: "geo-foundations",
      status: "UNAVAILABLE",
      enabled: false,
      attemptsRemaining: 0,
    });
  });

  it("keeps unknown assessment slugs as not found", async () => {
    await expect(
      serviceWithoutAssessment().overview("unknown", "user-1"),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
