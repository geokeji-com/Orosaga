import { describe, expect, it } from "vitest";
import {
  assessmentAttemptSchema,
  assessmentGateApprovalSchema,
  assessmentQuestionSchema,
  assessmentReportPayloadSchema,
  createAssessmentAttemptSchema,
  contentPayloadSchema,
  organizationQuerySchema,
  saveContentPageSchema,
  saveAssessmentAnswerSchema,
} from "./index.js";

describe("shared contracts", () => {
  it("accepts structured content without arbitrary HTML", () => {
    const content = {
      title: "公司",
      summary: "摘要",
      blocks: [{ type: "text", body: "正文" }],
    };
    expect(contentPayloadSchema.parse(content)).toEqual(content);
    expect(
      saveContentPageSchema.safeParse({
        expectedVersion: 1,
        changeSummary: "",
        content,
      }).success,
    ).toBe(false);
  });

  it("limits organization query input", () => {
    expect(
      organizationQuerySchema.safeParse({ q: "x".repeat(101) }).success,
    ).toBe(false);
    expect(organizationQuerySchema.safeParse({ q: "技术" }).success).toBe(true);
  });

  it("accepts a public assessment question without answer keys", () => {
    const parsed = assessmentQuestionSchema.parse({
      id: "91f38ef0-76d1-430a-93ee-2e65321a1a22",
      stableKey: "GEO-001",
      position: 1,
      primaryDimension: "D1",
      difficulty: "L2",
      stem: "应优先确认哪项数据边界？",
      options: [
        { id: "a", text: "样本范围" },
        { id: "b", text: "页面颜色" },
        { id: "c", text: "文件名称" },
        { id: "d", text: "汇报日期" },
      ],
      selectedOptionId: null,
      answerRevision: 0,
    });
    expect(parsed).not.toHaveProperty("correctOptionId");
    expect(parsed.options).toHaveLength(4);
  });

  it("rejects invalid attempt and answer mutation inputs", () => {
    expect(
      createAssessmentAttemptSchema.safeParse({ idempotencyKey: "short" })
        .success,
    ).toBe(false);
    expect(
      saveAssessmentAnswerSchema.safeParse({
        selectedOptionId: "e",
        revision: -1,
        activeDurationMs: -20,
      }).success,
    ).toBe(false);
  });

  it("describes terminal attempts and reproducible reports", () => {
    expect(
      assessmentAttemptSchema.safeParse({
        id: "2bf2fb73-8576-47c8-bec8-b8e35228cc8b",
        status: "SUBMITTED",
        kind: "FORMAL",
        attemptNumber: 1,
        startedAt: "2026-08-03T01:00:00.000Z",
        deadlineAt: "2026-08-03T01:30:00.000Z",
        submittedAt: "2026-08-03T01:25:00.000Z",
        answeredCount: 50,
        questionCount: 50,
        score: 86,
        version: "1.0.0",
      }).success,
    ).toBe(true);

    expect(
      assessmentReportPayloadSchema.safeParse({
        reportVersion: "1.0.0",
        generatedAt: "2026-08-03T01:25:01.000Z",
        score: 86,
        passScore: 80,
        passed: true,
        resultCounts: { correct: 43, incorrect: 7, unanswered: 0 },
        dimensions: [],
        sources: [],
        difficulties: [],
        topics: [],
        stages: [],
        misconceptions: [],
        timing: {
          totalDurationMs: 1500000,
          averageDurationMs: 30000,
          items: [],
        },
        recommendations: [],
        questionResults: [],
        history: [],
      }).success,
    ).toBe(true);
  });

  it("requires an auditable reference when recording human gates", () => {
    expect(
      assessmentGateApprovalSchema.safeParse({
        contentReviewStatus: "APPROVED",
        angoffStatus: "APPROVED",
        pilotStatus: "APPROVED",
        sourceReviewStatus: "CURRENT",
        passScore: 82,
        reviewReference: "",
      }).success,
    ).toBe(false);
  });
});
