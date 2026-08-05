import { describe, expect, it } from "vitest";
import { buildAssessmentReport } from "./assessment-report.js";

describe("assessment report", () => {
  it("builds reproducible aggregates, misconceptions and actionable advice", () => {
    const report = buildAssessmentReport({
      generatedAt: new Date("2026-08-03T02:30:00.000Z"),
      passScore: 80,
      attemptNumber: 1,
      submittedAt: new Date("2026-08-03T02:29:00.000Z"),
      previousAttempts: [],
      questions: [
        {
          questionId: "1fb6b701-2ef4-49d0-8c53-87f40ab672d3",
          stableKey: "GEO-001",
          position: 1,
          primaryDimension: "D1",
          sourceType: "DATA",
          difficulty: "L2",
          topic: "DATA_BOUNDARY",
          deliveryStages: ["diagnosis", "governance"],
          businessImportance: 5,
          stem: "现有数据可以直接支持哪项判断？",
          options: [
            { id: "a", text: "回答级推荐率" },
            { id: "b", text: "去重后的引用页面数" },
            { id: "c", text: "用户满意度" },
            { id: "d", text: "销售转化" },
          ],
          correctOptionId: "b",
          optionRationales: {
            a: "缺少回答级分母。",
            b: "数据提供去重标记。",
            c: "未采集用户反馈。",
            d: "未连接销售数据。",
          },
          misconceptions: {
            a: "M-DATA-OVERREACH",
            b: null,
            c: "M-DATA-OVERREACH",
            d: "M-ATTRIBUTION-LEAP",
          },
          misconceptionLabels: {
            "M-DATA-OVERREACH": "数据边界外推",
            "M-ATTRIBUTION-LEAP": "归因跳跃",
          },
          coreRationale: "应按照字段和分母判断可回答问题。",
          reasoningSteps: ["确认字段", "确认分母"],
          businessApplication: "先写数据边界，再输出客户结论。",
          sourceIds: ["D01"],
          learningPaths: ["/workflow"],
          selectedOptionId: "a",
          activeDurationMs: 20_000,
          changeCount: 1,
        },
        {
          questionId: "b3a3e63b-e2d3-48ee-8b0c-dd85a6d29f86",
          stableKey: "GEO-002",
          position: 2,
          primaryDimension: "D1",
          sourceType: "DATA",
          difficulty: "L1",
          topic: "DATA_BOUNDARY",
          deliveryStages: ["diagnosis"],
          businessImportance: 4,
          stem: "去重时应优先使用什么？",
          options: [
            { id: "a", text: "页面颜色" },
            { id: "b", text: "首选精确记录标记" },
            { id: "c", text: "随机删除" },
            { id: "d", text: "发布时间" },
          ],
          correctOptionId: "b",
          optionRationales: {
            a: "与去重无关。",
            b: "数据集已提供规范标记。",
            c: "无法复算。",
            d: "时间不足以识别重复。",
          },
          misconceptions: {
            a: "M-DATA-OVERREACH",
            b: null,
            c: "M-DATA-OVERREACH",
            d: "M-METRIC-CONFLATION",
          },
          misconceptionLabels: {
            "M-DATA-OVERREACH": "数据边界外推",
            "M-METRIC-CONFLATION": "指标混用",
          },
          coreRationale: "首选记录标记提供可复算的精确去重口径。",
          reasoningSteps: ["找到重复标记", "使用首选记录"],
          businessApplication: "报告统一引用去重口径。",
          sourceIds: ["D01"],
          learningPaths: ["/workflow"],
          selectedOptionId: "a",
          activeDurationMs: 10_000,
          changeCount: 0,
        },
      ],
    });

    expect(report.score).toBe(0);
    expect(report.resultCounts).toEqual({
      correct: 0,
      incorrect: 2,
      unanswered: 0,
    });
    expect(report.dimensions[0]).toMatchObject({
      key: "D1",
      correct: 0,
      total: 2,
      accuracy: 0,
      note: "样本较少（n=2），请结合逐题结果解读",
    });
    expect(report.misconceptions[0]).toMatchObject({
      code: "M-DATA-OVERREACH",
      count: 2,
    });
    expect(report.recommendations[0]).toMatchObject({
      title: "校准数据边界",
      learningPaths: ["/workflow"],
    });
    expect(report.questionResults[0]!.options[1]).toMatchObject({
      correct: true,
      rationale: "数据提供去重标记。",
    });
  });

  it("localizes report taxonomy and assigns risk-specific practice", () => {
    const riskQuestion = {
      questionId: "80d55569-f008-4816-9f5d-37480c4fc001",
      stableKey: "GEO-041",
      position: 41,
      primaryDimension: "D5" as const,
      sourceType: "BUSINESS" as const,
      difficulty: "L3" as const,
      topic: "RISK_MANIPULATION",
      deliveryStages: ["governance", "monitoring"],
      businessImportance: 5,
      stem: "上线 GEO 优化动作前应补充什么？",
      options: [
        { id: "a" as const, text: "风险审查与停止条件" },
        { id: "b" as const, text: "仅检查页面格式" },
        { id: "c" as const, text: "直接扩大投放范围" },
        { id: "d" as const, text: "忽略来源污染风险" },
      ],
      correctOptionId: "a" as const,
      optionRationales: {
        a: "能够约束风险。",
        b: "格式检查覆盖不了治理风险。",
        c: "扩大范围会放大未识别风险。",
        d: "来源污染会损害结果可靠性。",
      },
      misconceptions: {
        a: null,
        b: "M-RISK-BLIND",
        c: "M-RISK-BLIND",
        d: "M-RISK-BLIND",
      },
      misconceptionLabels: { "M-RISK-BLIND": "忽略安全与治理" },
      coreRationale: "上线前需要完成风险审查。",
      reasoningSteps: ["识别风险", "设置停止条件"],
      businessApplication: "用于客户交付上线门禁。",
      sourceIds: ["B01"],
      learningPaths: ["/workflow", "/systems"],
      selectedOptionId: "d" as const,
      activeDurationMs: 25_000,
      changeCount: 0,
    };
    const report = buildAssessmentReport({
      generatedAt: new Date("2026-08-03T02:30:00.000Z"),
      passScore: 80,
      attemptNumber: 1,
      submittedAt: new Date("2026-08-03T02:29:00.000Z"),
      previousAttempts: [],
      questions: [
        riskQuestion,
        {
          ...riskQuestion,
          questionId: "80d55569-f008-4816-9f5d-37480c4fc002",
          stableKey: "GEO-042",
          position: 42,
        },
      ],
    });

    expect(report.sources[0]?.label).toBe("移山业务");
    expect(report.topics[0]?.label).toBe("操纵与欺骗风险");
    expect(report.stages.map((item) => item.label)).toEqual(["治理", "监测"]);
    expect(report.recommendations[0]).toMatchObject({
      title: "加强风险治理",
      practice: expect.stringContaining("红队审查"),
      completionCriteria: expect.stringContaining("回滚动作"),
    });
  });
});
