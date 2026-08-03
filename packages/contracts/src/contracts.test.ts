import { describe, expect, it } from "vitest";
import {
  assessmentAttemptSchema,
  assessmentGateApprovalSchema,
  assessmentQuestionSchema,
  assessmentReportPayloadSchema,
  courseDetailSchema,
  courseModelLayoutSchema,
  courseModelNodeCountByLayout,
  courseModelSchema,
  courseStepSchema,
  createAssessmentAttemptSchema,
  contentPayloadSchema,
  organizationQuerySchema,
  saveContentPageSchema,
  saveAssessmentAnswerSchema,
  saveCourseFeedbackSchema,
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

  it("describes a 20 lesson pilot without exposing exercise keys", () => {
    const parsed = courseDetailSchema.parse({
      slug: "geo-foundations",
      shortTitle: "GEO 实战训练营",
      title: "从 AI 回答到 GEO 交付",
      description: "移山新人 20 课",
      packProfile: "PILOT",
      version: "pilot-1.0.0",
      lessonCount: 20,
      estimatedMinutes: 344,
      certificateAvailable: false,
      enrollment: null,
      greeting: {
        title: "欢迎来到学习中心",
        detail: "从第 1 节开始。",
        actionLabel: "开始学习",
      },
      chapters: Array.from({ length: 5 }, (_, chapterIndex) => ({
        key: `chapter-${chapterIndex + 1}`,
        number: chapterIndex + 1,
        title: `第 ${chapterIndex + 1} 章`,
        lessons: Array.from({ length: 4 }, (_, lessonIndex) => {
          const number = chapterIndex * 4 + lessonIndex + 1;
          return {
            key: `lesson-${String(number).padStart(2, "0")}`,
            number,
            chapterNumber: chapterIndex + 1,
            title: `第 ${number} 节`,
            goal: "完成一个判断。",
            estimatedMinutes: 16,
            artifact: "课程成果物",
            state: number === 1 ? "AVAILABLE" : "LOCKED",
            steps: (["story", "model", "practice"] as const).map(
              (step, stepIndex) => ({
                key: `lesson-${String(number).padStart(2, "0")}-${step}`,
                kind: ["STORY", "MODEL", "PRACTICE"][stepIndex],
                label: ["场景", "方法", "练习"][stepIndex],
                title: ["进入业务现场", "看懂底层方法", "完成本节判断"][
                  stepIndex
                ],
                href: `/courses/geo-foundations/lesson/lesson-${String(number).padStart(2, "0")}/step/lesson-${String(number).padStart(2, "0")}-${step}`,
                state: number === 1 && stepIndex === 0 ? "AVAILABLE" : "LOCKED",
              }),
            ),
          };
        }),
      })),
    });
    expect(parsed.lessonCount).toBe(20);
    expect(parsed.chapters.flatMap((chapter) => chapter.lessons)).toHaveLength(
      20,
    );
  });

  it("keeps every visual layout aligned with its supported node count", () => {
    for (const layout of courseModelLayoutSchema.options) {
      const expectedCount = courseModelNodeCountByLayout[layout];
      const nodes = Array.from({ length: expectedCount }, (_, index) => ({
        key: `${layout}-${index + 1}`,
        label: `节点 ${index + 1}`,
        description: "用于验证模型结构",
        tone: "blue" as const,
      }));
      const model = {
        title: "结构模型",
        layout,
        category: "结构验证",
        readingHint: "按模型关系阅读节点",
        nodes,
        caption: "节点数量与图形结构保持一致。",
      };

      expect(courseModelSchema.safeParse(model).success).toBe(true);

      const invalidNodes =
        expectedCount === 3 ? [...nodes, nodes[0]!] : nodes.slice(0, -1);
      expect(
        courseModelSchema.safeParse({ ...model, nodes: invalidNodes }).success,
      ).toBe(false);
    }
  });

  it("protects visual model copy length and semantic node identity", () => {
    const nodes = Array.from({ length: 5 }, (_, index) => ({
      key: `pipeline-${index + 1}`,
      label: `节点 ${index + 1}`,
      description: "用于验证模型结构",
      tone: "blue" as const,
    }));
    const model = {
      title: "结构模型",
      layout: "pipeline" as const,
      category: "结构验证",
      readingHint: "沿流程逐步阅读节点",
      nodes,
      caption: "节点数量与图形结构保持一致。",
    };

    expect(
      courseModelSchema.safeParse({ ...model, title: "课".repeat(41) }).success,
    ).toBe(false);
    expect(
      courseModelSchema.safeParse({
        ...model,
        nodes: [{ ...nodes[0]!, label: "节点".repeat(9) }, ...nodes.slice(1)],
      }).success,
    ).toBe(false);
    expect(
      courseModelSchema.safeParse({
        ...model,
        nodes: [
          { ...nodes[0]!, description: "说明".repeat(31) },
          ...nodes.slice(1),
        ],
      }).success,
    ).toBe(false);
    expect(
      courseModelSchema.safeParse({ ...model, caption: "结论".repeat(61) })
        .success,
    ).toBe(false);
    expect(
      courseModelSchema.safeParse({
        ...model,
        nodes: [
          nodes[0]!,
          { ...nodes[1]!, key: nodes[0]!.key },
          ...nodes.slice(2),
        ],
      }).success,
    ).toBe(false);
  });

  it("keeps answers out of the public course step and validates feedback", () => {
    const parsed = courseStepSchema.parse({
      key: "lesson-01-practice",
      lessonKey: "lesson-01",
      position: 3,
      kind: "PRACTICE",
      eyebrow: "练一练",
      title: "区分事实与判断",
      intro: "先根据已知材料作答。",
      actionLabel: "提交我的判断",
      sections: [],
      model: null,
      exercise: {
        key: "lesson-01-practice",
        stem: "哪项是可直接观察的事实？",
        options: [
          { id: "a", text: "回答提到品牌" },
          { id: "b", text: "品牌一定会转化" },
          { id: "c", text: "内容带来增长" },
          { id: "d", text: "客户适合所有平台" },
        ],
      },
      completed: false,
    });
    expect(parsed.actionLabel).toBe("提交我的判断");
    expect(parsed.exercise).not.toHaveProperty("correctOptionId");
    expect(
      saveCourseFeedbackSchema.safeParse({
        usefulness: 6,
        clarity: 5,
        difficulty: 3,
        recommendation: 5,
        mostHelpfulLessonKey: "lesson-01",
        comment: "有帮助",
      }).success,
    ).toBe(false);
    expect(
      saveCourseFeedbackSchema.safeParse({
        usefulness: 5,
        clarity: 5,
        difficulty: 3,
        recommendation: 5,
        mostHelpfulLessonKey: "lesson-21",
        comment: "有帮助",
      }).success,
    ).toBe(false);
  });
});
