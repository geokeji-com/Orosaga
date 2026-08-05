import { describe, expect, it } from "vitest";
import {
  capAnswerActiveDuration,
  calculateQuotaDate,
  effectiveSourceReviewStatus,
  evaluateAssessmentEligibility,
  scoreAssessment,
  shouldGenerateAssessmentReport,
} from "./assessment-rules.js";

describe("active answer duration", () => {
  it("keeps the total recorded duration within the attempt budget", () => {
    expect(capAnswerActiveDuration(0, 600_000, 1_500_000, 1_800_000)).toBe(
      300_000,
    );
    expect(
      capAnswerActiveDuration(120_000, 300_000, 1_700_000, 1_800_000),
    ).toBe(220_000);
    expect(capAnswerActiveDuration(0, 30_000, 1_800_000, 1_800_000)).toBe(0);
  });
});

describe("assessment rules", () => {
  it("uses the Asia/Shanghai calendar day for quota", () => {
    expect(calculateQuotaDate(new Date("2026-08-02T16:01:00.000Z"))).toBe(
      "2026-08-03",
    );
  });

  it("returns an active attempt before consuming another quota", () => {
    expect(
      evaluateAssessmentEligibility({
        enabled: true,
        sourceReviewStatus: "CURRENT",
        attemptsUsed: 2,
        attemptedToday: true,
        dailyLimit: 1,
        maxAttempts: 3,
        activeAttempt: {
          id: "3fa4a096-e326-4551-a54c-669bb78131ea",
          deadlineAt: new Date("2026-08-03T02:00:00.000Z"),
        },
      }),
    ).toEqual({
      status: "IN_PROGRESS",
      attemptsRemaining: 1,
      activeAttemptId: "3fa4a096-e326-4551-a54c-669bb78131ea",
      activeDeadlineAt: "2026-08-03T02:00:00.000Z",
    });
  });

  it("blocks new attempts while sources need review", () => {
    expect(
      evaluateAssessmentEligibility({
        enabled: true,
        sourceReviewStatus: "REVIEW_REQUIRED",
        attemptsUsed: 0,
        attemptedToday: false,
        dailyLimit: 1,
        maxAttempts: 3,
        activeAttempt: null,
      }).status,
    ).toBe("REVIEW_REQUIRED");
  });

  it("treats an overdue source review as requiring approval", () => {
    expect(
      effectiveSourceReviewStatus(
        "CURRENT",
        new Date("2026-08-03T01:00:00.000Z"),
        new Date("2026-08-03T01:00:01.000Z"),
      ),
    ).toBe("REVIEW_REQUIRED");
    expect(
      effectiveSourceReviewStatus(
        "CURRENT",
        new Date("2026-08-04T01:00:00.000Z"),
        new Date("2026-08-03T01:00:00.000Z"),
      ),
    ).toBe("CURRENT");
  });

  it("generates reports only for scored attempts", () => {
    expect(shouldGenerateAssessmentReport("SUBMITTED", null)).toBe(true);
    expect(shouldGenerateAssessmentReport("EXPIRED", "FAILED")).toBe(true);
    expect(shouldGenerateAssessmentReport("SUBMITTED", "READY")).toBe(false);
    expect(
      shouldGenerateAssessmentReport(
        "SUBMITTED",
        "FAILED",
        "DETAIL_RETENTION_EXPIRED",
      ),
    ).toBe(false);
    expect(shouldGenerateAssessmentReport("IN_PROGRESS", null)).toBe(false);
    expect(shouldGenerateAssessmentReport("VOIDED", null)).toBe(false);
  });

  it("enforces both daily and cycle attempt limits", () => {
    const base = {
      enabled: true,
      sourceReviewStatus: "CURRENT" as const,
      dailyLimit: 1,
      maxAttempts: 3,
      activeAttempt: null,
    };
    expect(
      evaluateAssessmentEligibility({
        ...base,
        attemptsUsed: 1,
        attemptedToday: true,
      }).status,
    ).toBe("DAILY_LIMIT_REACHED");
    expect(
      evaluateAssessmentEligibility({
        ...base,
        attemptsUsed: 3,
        attemptedToday: false,
      }).status,
    ).toBe("ATTEMPT_LIMIT_REACHED");
  });

  it("scores each item deterministically and treats unanswered items as zero", () => {
    const result = scoreAssessment(
      [
        { questionId: "q1", correctOptionId: "b" },
        { questionId: "q2", correctOptionId: "d" },
      ],
      [{ questionId: "q1", selectedOptionId: "b" }],
    );
    expect(result).toEqual({
      score: 50,
      correct: 1,
      incorrect: 0,
      unanswered: 1,
      results: [
        { questionId: "q1", isCorrect: true },
        { questionId: "q2", isCorrect: false },
      ],
    });
  });
});
