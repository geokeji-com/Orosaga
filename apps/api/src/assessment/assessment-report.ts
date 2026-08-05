import type { AssessmentReportPayload } from "@orosaga/contracts";

type OptionId = "a" | "b" | "c" | "d";
type ReportQuestion = {
  questionId: string;
  stableKey: string;
  position: number;
  primaryDimension: "D1" | "D2" | "D3" | "D4" | "D5";
  sourceType: "PAPER" | "DATA" | "BUSINESS";
  difficulty: "L1" | "L2" | "L3";
  topic: string;
  deliveryStages: string[];
  businessImportance: number;
  stem: string;
  options: Array<{ id: OptionId; text: string }>;
  correctOptionId: OptionId;
  optionRationales: Record<OptionId, string>;
  misconceptions: Record<OptionId, string | null>;
  misconceptionLabels: Record<string, string>;
  coreRationale: string;
  reasoningSteps: string[];
  businessApplication: string;
  sourceIds: string[];
  learningPaths: string[];
  selectedOptionId: OptionId | null;
  activeDurationMs: number;
  changeCount: number;
};

type ReportInput = {
  generatedAt: Date;
  passScore: number;
  attemptNumber: number;
  submittedAt: Date;
  previousAttempts: AssessmentReportPayload["history"];
  questions: ReportQuestion[];
};

const dimensionLabels: Record<string, string> = {
  D1: "概念与数据边界",
  D2: "研究与测量",
  D3: "策略与内容优化",
  D4: "交付与业务应用",
  D5: "风险与治理",
};
const sourceLabels: Record<string, string> = {
  PAPER: "论文证据",
  DATA: "原始数据",
  BUSINESS: "移山业务",
};
const difficultyLabels: Record<string, string> = {
  L1: "基础识别",
  L2: "场景应用",
  L3: "综合判断",
};
const recommendationTitles: Record<string, string> = {
  "M-AUTHORITY-ONLY": "建立多信号证据判断",
  "M-BUSINESS-MISMATCH": "对齐业务目标与交付",
  "M-CAUSAL-OVERREACH": "收紧因果表述",
  "M-DELIVERY-SKIP": "补齐交付链路",
  "M-FORMAT-SHORTCUT": "从格式技巧回到内容策略",
  "M-LOCAL-GLOBAL": "限定结论适用范围",
  "M-METRIC-CONFLATION": "拆分测量指标",
  "M-MISSING-DATA": "校准数据边界",
  "M-PLATFORM-FLAT": "建立平台差异策略",
  "M-RISK-BLIND": "加强风险治理",
  "M-DATA-OVERREACH": "校准数据边界",
  "M-ATTRIBUTION-LEAP": "收紧归因口径",
  "M-PLATFORM-UNIFORMITY": "建立平台差异策略",
  "M-RISK-BLINDNESS": "加强风险治理",
};
const topicLabels: Record<string, string> = {
  GEO_FOUNDATION: "GEO 基础概念",
  GEO_MEASUREMENT: "GEO 测量方法",
  AI_SEARCH_EMPIRICAL: "AI 搜索实证研究",
  DATA_BOUNDARY: "数据边界",
  BUSINESS_POSITIONING: "业务定位",
  CUSTOMER_FIT: "客户适配",
  GEO_METHODS: "GEO 方法体系",
  AEO_INTEGRATION: "AEO 协同",
  MULTIMODAL_GEO: "多模态 GEO",
  PLATFORM_DIFFERENCE: "平台差异",
  KNOWLEDGE_ASSET: "知识资产",
  AGENTIC_SEARCH: "智能体搜索",
  SEARCH_GOVERNANCE: "搜索治理",
  DATA_QUALITY: "数据质量",
  RAG_RETRIEVAL: "RAG 检索",
  SOURCE_VISIBILITY: "来源可见性",
  PLATFORM_OVERLAP: "平台重叠",
  CONTENT_PERFORMANCE: "内容表现",
  SOURCE_GOVERNANCE: "来源治理",
  DELIVERY_DIAGNOSIS: "交付诊断",
  DELIVERY_DATA_BOUNDARY: "交付数据边界",
  DELIVERY_ATTRIBUTION: "交付归因",
  DELIVERY_LOOP: "交付闭环",
  RISK_MANIPULATION: "操纵与欺骗风险",
  KNOWLEDGE_CONFLICT: "知识冲突",
  RETRIEVAL_POISONING: "检索污染",
  RANK_MANIPULATION: "排序操纵",
  MULTIMODAL_RISK: "多模态风险",
  WHITE_HAT_BOUNDARY: "白帽边界",
  RESULT_BOUNDARY: "结果边界",
  COMPETITOR_ETHICS: "竞品伦理",
};
const stageLabels: Record<string, string> = {
  diagnosis: "诊断",
  strategy: "策略",
  implementation: "实施",
  monitoring: "监测",
  attribution: "归因",
  governance: "治理",
  iteration: "迭代",
};
type RecommendationGuidance = {
  practice: string;
  completionCriteria: string;
};
const recommendationGuidance: Record<string, RecommendationGuidance> = {
  "M-AUTHORITY-ONLY": {
    practice:
      "选取一个 GEO 结论，按相关性、可验证性、时效性和来源透明度建立多信号证据表。",
    completionCriteria:
      "复核人可以依据证据表复现来源取舍，结论不依赖单一权威标签。",
  },
  "M-BUSINESS-MISMATCH": {
    practice:
      "用一个真实客户目标写出业务问题、受众、内容动作和验收指标的对应关系。",
    completionCriteria: "每项动作都能回溯到客户目标，并由明确指标验证。",
  },
  "M-CAUSAL-OVERREACH": {
    practice:
      "把一个相关性结果分别改写为观察事实、可检验假设和仍需补充的因果证据。",
    completionCriteria: "结论清楚区分相关与因果，并说明替代解释和验证条件。",
  },
  "M-DELIVERY-SKIP": {
    practice:
      "选择一个交付案例，补齐诊断、策略、实施、监测、归因与复盘的责任人和产物。",
    completionCriteria:
      "六个阶段都有明确输入、输出、负责人和进入下一阶段的验收条件。",
  },
  "M-FORMAT-SHORTCUT": {
    practice:
      "选择一篇现有内容，先定义用户问题、信息增益、证据和实体关系，再决定结构与标记。",
    completionCriteria:
      "内容策略能够独立说明用户价值和证据贡献，格式只承担表达与机器理解作用。",
  },
  "M-LOCAL-GLOBAL": {
    practice:
      "从一个单平台样本制作结论边界卡，列出平台、时间、语言、地区、样本和可迁移条件。",
    completionCriteria:
      "结论标明适用范围，并说明扩展到其他场景前需要补充的验证。",
  },
  "M-METRIC-CONFLATION": {
    practice:
      "为同一案例分别定义曝光、提及、引用、推荐与转化指标，写清分子、分母和统计粒度。",
    completionCriteria: "每个指标都有唯一口径，复核人能够从原始记录复算结果。",
  },
  "M-MISSING-DATA": {
    practice:
      "用一份存在缺失的数据做缺失机制检查，标记缺失比例、受影响字段和敏感性分析。",
    completionCriteria: "报告披露缺失对结论的影响，并给出保守口径或补采计划。",
  },
  "M-PLATFORM-FLAT": {
    practice:
      "选择同一查询在两个平台比较来源、答案结构、刷新频率和内容偏好，形成差异化动作。",
    completionCriteria:
      "每个平台都有独立证据和策略，公共动作与平台特定动作可以清楚区分。",
  },
  "M-RISK-BLIND": {
    practice:
      "对一个 GEO 优化方案做红队审查，列出操纵、污染、隐私、版权和声誉风险及停止条件。",
    completionCriteria:
      "通过安全负责人复核，并包含监测指标、告警阈值、回滚动作和责任人。",
  },
};
recommendationGuidance["M-DATA-OVERREACH"] =
  recommendationGuidance["M-MISSING-DATA"]!;
recommendationGuidance["M-ATTRIBUTION-LEAP"] =
  recommendationGuidance["M-CAUSAL-OVERREACH"]!;
recommendationGuidance["M-PLATFORM-UNIFORMITY"] =
  recommendationGuidance["M-PLATFORM-FLAT"]!;
recommendationGuidance["M-RISK-BLINDNESS"] =
  recommendationGuidance["M-RISK-BLIND"]!;

const fallbackGuidance: RecommendationGuidance = {
  practice:
    "选择一个与该误区相关的真实案例，写出判断依据、关键步骤和风险边界。",
  completionCriteria:
    "复核人能够复现判断过程，并确认结论、动作与证据保持一致。",
};

const accuracy = (correct: number, total: number) =>
  total ? Number((correct / total).toFixed(4)) : 0;

const aggregate = (
  questions: ReportQuestion[],
  keyOf: (question: ReportQuestion) => string[],
  labelOf: (key: string) => string,
) => {
  const groups = new Map<string, { correct: number; total: number }>();
  for (const question of questions) {
    const isCorrect = question.selectedOptionId === question.correctOptionId;
    for (const key of keyOf(question)) {
      const current = groups.get(key) ?? { correct: 0, total: 0 };
      current.total += 1;
      if (isCorrect) current.correct += 1;
      groups.set(key, current);
    }
  }
  return [...groups.entries()].map(([key, result]) => ({
    key,
    label: labelOf(key),
    correct: result.correct,
    total: result.total,
    accuracy: accuracy(result.correct, result.total),
    ...(result.total < 5
      ? { note: `样本较少（n=${result.total}），请结合逐题结果解读` }
      : {}),
  }));
};

export const buildAssessmentReport = (
  input: ReportInput,
): AssessmentReportPayload => {
  const correct = input.questions.filter(
    (question) => question.selectedOptionId === question.correctOptionId,
  ).length;
  const unanswered = input.questions.filter(
    (question) => question.selectedOptionId === null,
  ).length;
  const incorrect = input.questions.length - correct - unanswered;
  const score = input.questions.length
    ? Math.round((correct / input.questions.length) * 100)
    : 0;

  const misconceptionGroups = new Map<
    string,
    {
      label: string;
      questionKeys: string[];
      importance: number;
      paths: Set<string>;
    }
  >();
  for (const question of input.questions) {
    if (
      !question.selectedOptionId ||
      question.selectedOptionId === question.correctOptionId
    )
      continue;
    const code = question.misconceptions[question.selectedOptionId];
    if (!code) continue;
    const current = misconceptionGroups.get(code) ?? {
      label: question.misconceptionLabels[code] ?? code,
      questionKeys: [],
      importance: 0,
      paths: new Set<string>(),
    };
    current.questionKeys.push(question.stableKey);
    current.importance += question.businessImportance;
    question.learningPaths.forEach((path) => current.paths.add(path));
    misconceptionGroups.set(code, current);
  }

  const misconceptions = [...misconceptionGroups.entries()]
    .map(([code, item]) => ({
      code,
      label: item.label,
      count: item.questionKeys.length,
      questionKeys: item.questionKeys,
    }))
    .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));

  const recommendations = [...misconceptionGroups.entries()]
    .filter(([, item]) => item.questionKeys.length >= 2)
    .sort(
      (a, b) =>
        b[1].importance - a[1].importance ||
        b[1].questionKeys.length - a[1].questionKeys.length ||
        a[0].localeCompare(b[0]),
    )
    .slice(0, 8)
    .map(([code, item], index) => {
      const guidance = recommendationGuidance[code] ?? fallbackGuidance;
      return {
        priority: index + 1,
        title: recommendationTitles[code] ?? `复盘${item.label}`,
        reason: `${item.questionKeys.length} 道题呈现“${item.label}”误区，涉及 ${item.questionKeys.join("、")}。`,
        evidence: item.questionKeys,
        learningPaths: [...item.paths],
        practice: guidance.practice,
        completionCriteria: guidance.completionCriteria,
      };
    });

  const dimensions = aggregate(
    input.questions,
    (question) => [question.primaryDimension],
    (key) => dimensionLabels[key] ?? key,
  );
  const dimensionScores = Object.fromEntries(
    dimensions.map((item) => [item.key, Math.round(item.accuracy * 100)]),
  );
  const totalDurationMs = input.questions.reduce(
    (sum, question) => sum + question.activeDurationMs,
    0,
  );

  return {
    reportVersion: "1.0.0",
    generatedAt: input.generatedAt.toISOString(),
    score,
    passScore: input.passScore,
    passed: score >= input.passScore,
    resultCounts: { correct, incorrect, unanswered },
    dimensions,
    sources: aggregate(
      input.questions,
      (question) => [question.sourceType],
      (key) => sourceLabels[key] ?? key,
    ),
    difficulties: aggregate(
      input.questions,
      (question) => [question.difficulty],
      (key) => difficultyLabels[key] ?? key,
    ),
    topics: aggregate(
      input.questions,
      (question) => [question.topic],
      (key) => topicLabels[key] ?? key.replaceAll("_", " "),
    ),
    stages: aggregate(
      input.questions,
      (question) => question.deliveryStages,
      (key) => stageLabels[key] ?? key,
    ),
    misconceptions,
    timing: {
      totalDurationMs,
      averageDurationMs: input.questions.length
        ? Math.round(totalDurationMs / input.questions.length)
        : 0,
      items: input.questions.map((question) => ({
        questionKey: question.stableKey,
        durationMs: question.activeDurationMs,
        correct: question.selectedOptionId === question.correctOptionId,
        difficulty: question.difficulty,
      })),
    },
    recommendations,
    questionResults: input.questions.map((question) => ({
      questionId: question.questionId,
      stableKey: question.stableKey,
      position: question.position,
      primaryDimension: question.primaryDimension,
      difficulty: question.difficulty,
      businessImportance: question.businessImportance,
      stem: question.stem,
      options: question.options.map((option) => ({
        ...option,
        rationale: question.optionRationales[option.id],
        selected: option.id === question.selectedOptionId,
        correct: option.id === question.correctOptionId,
      })),
      selectedOptionId: question.selectedOptionId,
      correctOptionId: question.correctOptionId,
      correct: question.selectedOptionId === question.correctOptionId,
      coreRationale: question.coreRationale,
      reasoningSteps: question.reasoningSteps,
      businessApplication: question.businessApplication,
      sourceIds: question.sourceIds,
      learningPaths: question.learningPaths,
      misconceptionCode: question.selectedOptionId
        ? question.misconceptions[question.selectedOptionId]
        : null,
      activeDurationMs: question.activeDurationMs,
      changeCount: question.changeCount,
    })),
    history: [
      ...input.previousAttempts,
      {
        attemptNumber: input.attemptNumber,
        score,
        submittedAt: input.submittedAt.toISOString(),
        dimensionScores,
      },
    ],
  };
};
