import type {
  AssessmentAttempt,
  AssessmentQuestion,
  AssessmentReportPayload,
  SessionUser,
} from "@orosaga/contracts";

export const assessmentUser: SessionUser = {
  id: "00000000-0000-4000-8000-000000000001",
  feishuOpenId: "ou_assessment_preview",
  displayName: "本地管理员",
  role: "ADMIN",
  status: "ACTIVE",
  permissions: [],
  csrfToken: "assessment-preview-csrf",
};

export const assessmentAttempt: AssessmentAttempt = {
  id: "10000000-0000-4000-8000-000000000001",
  status: "IN_PROGRESS",
  attemptNumber: 1,
  startedAt: "2026-08-03T01:00:00.000Z",
  deadlineAt: "2027-08-03T01:30:00.000Z",
  submittedAt: null,
  answeredCount: 12,
  questionCount: 50,
  score: null,
  version: "1.0.0",
};

export function assessmentQuestion(position: number): AssessmentQuestion {
  return {
    id: `20000000-0000-4000-8000-${String(position).padStart(12, "0")}`,
    stableKey: `GEO-${String(position).padStart(3, "0")}`,
    position,
    primaryDimension:
      `D${Math.ceil(position / 10)}` as AssessmentQuestion["primaryDimension"],
    difficulty: position <= 10 ? "L1" : position <= 35 ? "L2" : "L3",
    stem: "客户报告准备引用一项 GEO 数据结论，交付前应优先完成哪一步？",
    options: [
      { id: "a", text: "核对字段、分母、样本范围和适用边界" },
      { id: "b", text: "直接选择数值最高的指标作为结论" },
      { id: "c", text: "沿用上一期报告的解释口径" },
      { id: "d", text: "先优化版式，再决定数据含义" },
    ],
    selectedOptionId: null,
    answerRevision: 0,
  };
}

const aggregate = (
  key: string,
  label: string,
  correct: number,
  total = 10,
) => ({
  key,
  label,
  correct,
  total,
  accuracy: correct / total,
});

export const assessmentReportPayload: AssessmentReportPayload = {
  reportVersion: "1.0.0",
  generatedAt: "2026-08-03T01:28:00.000Z",
  score: 78,
  passScore: 80,
  passed: false,
  resultCounts: { correct: 39, incorrect: 11, unanswered: 0 },
  dimensions: [
    aggregate("D1", "概念与数据边界", 9),
    aggregate("D2", "研究与测量", 8),
    aggregate("D3", "策略与内容优化", 7),
    aggregate("D4", "交付与业务应用", 8),
    aggregate("D5", "风险与治理", 7),
  ],
  sources: [
    aggregate("PAPER", "论文证据", 24, 30),
    aggregate("DATA", "原始数据", 7),
    aggregate("BUSINESS", "移山业务", 8),
  ],
  difficulties: [
    aggregate("L1", "基础识别", 9),
    aggregate("L2", "场景应用", 20, 25),
    aggregate("L3", "综合判断", 10, 15),
  ],
  topics: [
    aggregate("DATA_BOUNDARY", "数据边界", 6, 8),
    aggregate("MEASUREMENT", "研究测量", 7, 9),
    aggregate("CONTENT", "内容策略", 9, 11),
    aggregate("DELIVERY", "业务交付", 10, 12),
    aggregate("GOVERNANCE", "风险治理", 7),
  ],
  stages: [
    aggregate("diagnosis", "诊断", 8),
    aggregate("strategy", "策略", 7),
    aggregate("execution", "执行", 8),
    aggregate("review", "复盘", 9),
  ],
  misconceptions: [
    {
      code: "M-DATA-OVERREACH",
      label: "数据边界外推",
      count: 4,
      questionKeys: ["GEO-011", "GEO-022", "GEO-031", "GEO-044"],
    },
    {
      code: "M-METRIC-CONFLATION",
      label: "指标混用",
      count: 3,
      questionKeys: ["GEO-016", "GEO-027", "GEO-048"],
    },
    {
      code: "M-DELIVERY-SKIP",
      label: "交付链路缺失",
      count: 2,
      questionKeys: ["GEO-035", "GEO-047"],
    },
  ],
  timing: {
    totalDurationMs: 1_368_000,
    averageDurationMs: 27_360,
    items: Array.from({ length: 50 }, (_, index) => ({
      questionKey: `GEO-${String(index + 1).padStart(3, "0")}`,
      durationMs: 12_000 + (index % 8) * 5_000,
      correct: index % 5 !== 0,
      difficulty: index < 10 ? "L1" : index < 35 ? "L2" : "L3",
    })),
  },
  recommendations: [
    {
      priority: 1,
      title: "校准数据边界",
      reason: "4 道题呈现数据边界外推误区。",
      evidence: ["GEO-011", "GEO-022", "GEO-031", "GEO-044"],
      learningPaths: ["/workflow/diagnosis", "/camps"],
      practice: "用一个真实客户案例写出字段、分母、适用范围和限制条件。",
      completionCriteria:
        "复核人能够依据同一口径复算结论，并确认结论处于证据边界内。",
    },
    {
      priority: 2,
      title: "拆分测量指标",
      reason: "3 道题呈现指标混用误区。",
      evidence: ["GEO-016", "GEO-027", "GEO-048"],
      learningPaths: ["/workflow/measurement"],
      practice: "为同一数据表分别写出记录级、回答级和页面级指标。",
      completionCriteria: "三个指标均包含清晰分母和适用场景。",
    },
  ],
  questionResults: Array.from({ length: 50 }, (_, index) => {
    const position = index + 1;
    const correct = index % 5 !== 0;
    return {
      questionId: `20000000-0000-4000-8000-${String(position).padStart(12, "0")}`,
      stableKey: `GEO-${String(position).padStart(3, "0")}`,
      position,
      primaryDimension: `D${Math.ceil(position / 10)}` as
        "D1" | "D2" | "D3" | "D4" | "D5",
      difficulty:
        position <= 10
          ? ("L1" as const)
          : position <= 35
            ? ("L2" as const)
            : ("L3" as const),
      businessImportance: (position % 5 || 5) as 1 | 2 | 3 | 4 | 5,
      stem: `第 ${position} 题：客户报告准备引用 GEO 数据结论时，应如何确认其证据边界？`,
      options: [
        {
          id: "a" as const,
          text: "核对字段、分母和样本范围",
          rationale: "这一步让结论保持可复算。",
          selected: correct,
          correct: true,
        },
        {
          id: "b" as const,
          text: "选择数值最高的指标",
          rationale: "数值大小不能替代指标定义。",
          selected: !correct,
          correct: false,
        },
        {
          id: "c" as const,
          text: "沿用历史结论",
          rationale: "历史口径可能不适用于当前样本。",
          selected: false,
          correct: false,
        },
        {
          id: "d" as const,
          text: "先调整报告版式",
          rationale: "版式不能确定数据含义。",
          selected: false,
          correct: false,
        },
      ],
      selectedOptionId: correct ? ("a" as const) : ("b" as const),
      correctOptionId: "a" as const,
      correct,
      coreRationale: "数据结论应由字段、分母、样本范围和限制条件共同限定。",
      reasoningSteps: [
        "确认问题对应的数据字段",
        "核对分母与样本范围",
        "记录适用范围和限制条件",
      ],
      businessApplication:
        "客户诊断报告应保留可复算口径，复核人可以从原始数据恢复结论。",
      sourceIds: [index < 30 ? "P01" : index < 40 ? "D01" : "B01"],
      learningPaths: ["/workflow/diagnosis"],
      misconceptionCode: correct ? null : "M-DATA-OVERREACH",
      activeDurationMs: 12_000 + (index % 8) * 5_000,
      changeCount: index % 4 === 0 ? 1 : 0,
    };
  }),
  history: [
    {
      attemptNumber: 1,
      score: 68,
      submittedAt: "2026-08-02T01:26:00.000Z",
      dimensionScores: { D1: 70, D2: 60, D3: 60, D4: 80, D5: 70 },
    },
    {
      attemptNumber: 2,
      score: 78,
      submittedAt: "2026-08-03T01:28:00.000Z",
      dimensionScores: { D1: 90, D2: 80, D3: 70, D4: 80, D5: 70 },
    },
  ],
};
