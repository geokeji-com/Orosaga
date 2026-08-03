import type { CourseModelLayout } from "@orosaga/contracts";

type OptionId = "a" | "b" | "c" | "d";
type Tone = "blue" | "green" | "amber" | "violet";

export type CourseLessonDefinition = {
  key: string;
  number: number;
  chapterNumber: number;
  title: string;
  goal: string;
  estimatedMinutes: number;
  artifact: string;
  storyActionLabel: string;
  modelActionLabel: string;
  scenario: string;
  wrongPath: string;
  yishanMethod: string;
  principle: string;
  modelTitle: string;
  modelLayout: CourseModelLayout;
  modelCaption: string;
  modelNodes: Array<{
    label: string;
    description: string;
    tone: Tone;
  }>;
  question: string;
  options: Array<{ id: OptionId; text: string }>;
  correctOptionId: OptionId;
  hint: string;
  analysis: string;
  optionAnalyses: Record<OptionId, string>;
};

const lessonActionLabels: Record<
  number,
  Pick<CourseLessonDefinition, "storyActionLabel" | "modelActionLabel">
> = {
  1: {
    storyActionLabel: "现场我看懂了，看看四步链路",
    modelActionLabel: "四步链路我理解了，来做判断",
  },
  2: {
    storyActionLabel: "搜索现场清楚了，看看五段链",
    modelActionLabel: "五段搜索链我理解了，来做判断",
  },
  3: {
    storyActionLabel: "协同场景清楚了，看看边界",
    modelActionLabel: "协同边界我理解了，来做判断",
  },
  4: {
    storyActionLabel: "证据问题清楚了，看看边界阶梯",
    modelActionLabel: "证据边界我理解了，来做判断",
  },
  5: {
    storyActionLabel: "用户问题清楚了，开始拆问句",
    modelActionLabel: "监测问句我会拆了，来做判断",
  },
  6: {
    storyActionLabel: "事实材料清楚了，看看知识卡",
    modelActionLabel: "知识卡结构我理解了，来做判断",
  },
  7: {
    storyActionLabel: "内容任务清楚了，看看答案单元",
    modelActionLabel: "答案单元我理解了，来做判断",
  },
  8: {
    storyActionLabel: "信源场景清楚了，看看四层图谱",
    modelActionLabel: "四层信源我理解了，来做判断",
  },
  9: {
    storyActionLabel: "指标问题清楚了，看看指标树",
    modelActionLabel: "四层指标树我理解了，来做判断",
  },
  10: {
    storyActionLabel: "采集问题清楚了，看看采样方法",
    modelActionLabel: "多轮采样我理解了，来做判断",
  },
  11: {
    storyActionLabel: "归因难点清楚了，看看证据阶梯",
    modelActionLabel: "归因证据我理解了，来做判断",
  },
  12: {
    storyActionLabel: "诊断问题清楚了，看看优先级",
    modelActionLabel: "优先级矩阵我理解了，来做判断",
  },
  13: {
    storyActionLabel: "交接现场清楚了，看看首周路径",
    modelActionLabel: "首周路径我理解了，来做判断",
  },
  14: {
    storyActionLabel: "生产问题清楚了，看看完整管道",
    modelActionLabel: "生产管道我理解了，来做判断",
  },
  15: {
    storyActionLabel: "母稿任务清楚了，看看审核门",
    modelActionLabel: "五道审核门我理解了，来做判断",
  },
  16: {
    storyActionLabel: "发布现场清楚了，看看追踪状态",
    modelActionLabel: "引用状态机我理解了，来做判断",
  },
  17: {
    storyActionLabel: "回流场景清楚了，看看验证闭环",
    modelActionLabel: "验证闭环我理解了，来做判断",
  },
  18: {
    storyActionLabel: "客户问题清楚了，看看沟通漏斗",
    modelActionLabel: "沟通漏斗我理解了，来做判断",
  },
  19: {
    storyActionLabel: "风险场景清楚了，看看恢复链",
    modelActionLabel: "风险恢复链我理解了，来做判断",
  },
  20: {
    storyActionLabel: "实战任务清楚了，打开综合工作台",
    modelActionLabel: "综合工作台我理解了，完成最后判断",
  },
};

const lessonModelLayouts: Record<number, CourseModelLayout> = {
  1: "journey",
  2: "pipeline",
  3: "overlap",
  4: "staircase",
  5: "funnel",
  6: "layers",
  7: "answer-unit",
  8: "network",
  9: "tree",
  10: "experiment",
  11: "evidence-ladder",
  12: "matrix",
  13: "roadmap",
  14: "production-line",
  15: "gates",
  16: "state-machine",
  17: "feedback-loop",
  18: "conversation-funnel",
  19: "recovery-chain",
  20: "workbench",
};

const lessonModelNodeKeys: Record<number, Record<string, string>> = {
  1: {
    用户问题: "user-question",
    答案观察: "answer-observation",
    证据核验: "evidence-check",
    业务动作: "business-action",
  },
  2: {
    搜索触发: "search-trigger",
    候选检索: "candidate-retrieval",
    片段吸收: "passage-absorption",
    答案生成: "answer-generation",
    引用呈现: "citation-display",
  },
  3: {
    SEO: "seo",
    AEO: "aeo",
    GEO: "geo",
    共享底座: "shared-foundation",
  },
  4: {
    观察: "observation",
    限定结论: "bounded-conclusion",
    可验证推断: "verifiable-inference",
  },
  5: {
    业务目标: "business-goal",
    角色与场景: "role-scenario",
    用户意图: "user-intent",
    监测问句: "monitoring-question",
  },
  6: {
    证据与来源: "evidence-source",
    事实: "fact",
    表达主张: "claim",
    审核与缺口: "review-gap",
  },
  7: {
    目标问题: "target-question",
    直接回答: "direct-answer",
    事实与证据: "fact-evidence",
    边界与复核: "boundary-review",
  },
  8: {
    事实源: "fact-source",
    解释源: "explanation-source",
    验证源: "verification-source",
    分发源: "distribution-source",
  },
  9: {
    业务结果: "business-outcome",
    答案结果: "answer-outcome",
    引用过程: "citation-process",
    生产投放: "production-distribution",
  },
  10: {
    控制条件: "controlled-conditions",
    多轮样本: "repeated-samples",
    比较与留存: "compare-retain",
  },
  11: {
    相关变化: "correlated-change",
    机制支持: "mechanism-support",
    对照验证: "control-validation",
    限定归因: "bounded-attribution",
  },
  12: {
    试验: "experiment",
    优先: "priority",
    暂缓: "defer",
    观察: "observe",
  },
  13: {
    会前: "pre-meeting",
    会中: "in-meeting",
    会后: "post-meeting",
  },
  14: {
    QMap: "qmap",
    "Card Pack": "card-pack",
    内容任务: "content-task",
    监测项: "monitoring-item",
  },
  15: {
    事实准确: "factual-accuracy",
    证据可追: "traceable-evidence",
    品牌一致: "brand-consistency",
    合规授权: "compliance-authorization",
    人工放行: "human-release",
  },
  16: {
    发布确认: "publication-confirmed",
    可访问: "accessible",
    被选择: "selected",
    被引用: "cited",
    进入表达: "expressed",
  },
  17: {
    监测结果: "monitor-results",
    诊断原因: "diagnose-cause",
    修正资产: "revise-assets",
    再验证: "revalidate",
  },
  18: {
    表层问题: "surface-question",
    真实关注: "real-concern",
    证据与边界: "evidence-boundary",
    行动与确认: "action-confirmation",
  },
  19: {
    风险信号: "risk-signal",
    预防: "prevention",
    即时处置: "immediate-response",
    恢复: "recovery",
  },
  20: {
    目标与事实: "goal-facts",
    方法与内容: "method-content",
    数据与归因: "data-attribution",
    交付与责任: "delivery-accountability",
    风险与治理: "risk-governance",
  },
};

const modelMetadata: Record<
  CourseModelLayout,
  { category: string; readingHint: string }
> = {
  journey: {
    category: "行动路径",
    readingHint: "沿箭头从真实问题走向可执行动作",
  },
  pipeline: {
    category: "流程管道",
    readingHint: "逐段检查输入是否进入下一环节",
  },
  overlap: {
    category: "协同边界",
    readingHint: "先看各自目标，再看共享能力底座",
  },
  staircase: {
    category: "证据阶梯",
    readingHint: "证据每增强一级，结论范围才能扩大一级",
  },
  funnel: {
    category: "问题漏斗",
    readingHint: "从业务目标逐层收敛到可重复问句",
  },
  layers: {
    category: "知识剖面",
    readingHint: "从来源与证据向上组织可审核主张",
  },
  "answer-unit": {
    category: "答案单元",
    readingHint: "把结构、证据和审核装进同一内容单元",
  },
  network: {
    category: "信源网络",
    readingHint: "观察来源层级、角色差异和互证关系",
  },
  tree: {
    category: "指标树",
    readingHint: "从业务结果向下拆到可采集指标",
  },
  experiment: {
    category: "对照实验",
    readingHint: "固定控制变量，再比较多轮采样结果",
  },
  "evidence-ladder": {
    category: "归因阶梯",
    readingHint: "从共同变化逐级走向可复核归因",
  },
  matrix: {
    category: "优先矩阵",
    readingHint: "同时判断业务影响和团队可控性",
  },
  roadmap: {
    category: "关键路径",
    readingHint: "沿时间顺序确认责任、产物和验收节点",
  },
  "production-line": {
    category: "生产管道",
    readingHint: "让问题、知识、内容和监测连续流动",
  },
  gates: {
    category: "审核门",
    readingHint: "每道门通过后，母稿才能进入下一状态",
  },
  "state-machine": {
    category: "发布状态机",
    readingHint: "根据当前状态决定动作和下一次检查",
  },
  "feedback-loop": {
    category: "验证闭环",
    readingHint: "监测、诊断、修正和复核持续循环",
  },
  "conversation-funnel": {
    category: "沟通沙漏",
    readingHint: "先收拢真实关注，再展开证据与行动",
  },
  "recovery-chain": {
    category: "风险恢复链",
    readingHint: "按预防、处置和恢复顺序守住责任边界",
  },
  workbench: {
    category: "综合工作台",
    readingHint: "横向连接目标、动作、数据、交付和治理",
  },
};

const lesson = (
  value: Omit<
    CourseLessonDefinition,
    | "key"
    | "chapterNumber"
    | "storyActionLabel"
    | "modelActionLabel"
    | "modelLayout"
  >,
): CourseLessonDefinition => {
  const actionLabels = lessonActionLabels[value.number];
  const modelLayout = lessonModelLayouts[value.number];
  if (!actionLabels)
    throw new Error(`Missing course action labels for lesson ${value.number}`);
  if (!modelLayout)
    throw new Error(`Missing course model layout for lesson ${value.number}`);
  return {
    ...value,
    ...actionLabels,
    modelLayout,
    key: `lesson-${String(value.number).padStart(2, "0")}`,
    chapterNumber: Math.ceil(value.number / 4),
  };
};

export const courseChapters = [
  { key: "chapter-1", number: 1, title: "看懂答案入口" },
  { key: "chapter-2", number: 2, title: "建设可引用知识" },
  { key: "chapter-3", number: 3, title: "用数据作判断" },
  { key: "chapter-4", number: 4, title: "跑通移山交付" },
  { key: "chapter-5", number: 5, title: "把项目带到结果" },
] as const;

export const courseLessons: CourseLessonDefinition[] = [
  lesson({
    number: 1,
    title: "用户已经走进答案入口",
    goal: "识别 AI 答案中的基础问题，并把观察事实和业务判断分开。",
    estimatedMinutes: 14,
    artifact: "澄屿项目事实页",
    scenario:
      "澄屿工业热能的顾言发来三张平台截图。同一个采购问题里，品牌有时出现、有时缺席，产品描述也不一致。林岚需要决定首轮诊断应该确认什么。",
    wrongPath:
      "团队只看官网流量和网页排名，直接承诺提升推荐。项目范围、客户期待和数据口径从第一天就失去共同基准。",
    yishanMethod:
      "把问题拆成四个观察面：有没有出现、处于什么位置、是否被引用、表达是否准确。再根据品牌基础、业务解释成本、归因诉求和合规要求判断是否进入下一轮。",
    principle:
      "用户正在从链接列表走向直接答案。品牌信息需要进入可理解、可引用、可验证的知识环境，单一网页指标无法覆盖这条链路。",
    modelTitle: "从用户问题到业务动作",
    modelCaption: "每一段都需要独立证据，后续结论只能沿着已确认的链路前进。",
    modelNodes: [
      { label: "用户问题", description: "真实角色和决策任务", tone: "blue" },
      {
        label: "答案观察",
        description: "出现、位置、引用和表达",
        tone: "amber",
      },
      {
        label: "证据核验",
        description: "区分观察事实与业务判断",
        tone: "violet",
      },
      { label: "业务动作", description: "诊断范围与补采计划", tone: "green" },
    ],
    question: "目前只有三张回答截图，哪一步最适合作为下一步？",
    options: [
      { id: "a", text: "先记录可观察字段，再列出待验证原因" },
      { id: "b", text: "直接承诺下月推荐率提升" },
      { id: "c", text: "用官网流量代替答案表现" },
      { id: "d", text: "把三张截图写成全部平台趋势" },
    ],
    correctOptionId: "a",
    hint: "回到截图本身，先区分看得到的字段和仍需采集的判断。",
    analysis:
      "三张截图可以支持当时的出现、位置、引用和表达观察，暂时无法支持趋势、原因和转化判断。首轮动作应保留原始证据，并写出补采范围。",
    optionAnalyses: {
      a: "正确。证据和判断边界被分开，后续诊断仍可复核。",
      b: "缺少重复采样和归因证据，当前无法承诺结果。",
      c: "官网流量描述网页访问，无法替代 AI 答案表现。",
      d: "样本只有三个时点，平台和时间范围都不足。",
    },
  }),
  lesson({
    number: 2,
    title: "AI 如何找到、选择和吸收信息",
    goal: "画出生成式搜索链路，定位搜索、选择、吸收、生成和引用中的断点。",
    estimatedMinutes: 16,
    artifact: "澄屿 AI 搜索链路图",
    scenario:
      "客户确认文章已经发布且可以打开，回答中仍然没有品牌。团队需要确定下一步检查顺序。",
    wrongPath:
      "把页面可抓取直接写成答案会推荐品牌，后续所有变化都归因到发布动作。",
    yishanMethod:
      "逐层检查可获取性、问题相关性、片段质量、来源选择和答案表达，从最靠前的未确认节点开始补证据。",
    principle:
      "生成式搜索由多个独立节点组成。前一节点成功只代表具备进入下一节点的条件。",
    modelTitle: "生成式搜索五段链",
    modelCaption:
      "关闭任一节点，后续结果都可能消失。断点诊断需要从已确认事实继续向后检查。",
    modelNodes: [
      { label: "搜索触发", description: "问题是否触发检索", tone: "blue" },
      { label: "候选检索", description: "系统是否找到相关页面", tone: "green" },
      {
        label: "片段吸收",
        description: "事实是否容易抽取和理解",
        tone: "amber",
      },
      {
        label: "答案生成",
        description: "信息是否进入回答表达",
        tone: "violet",
      },
      {
        label: "引用呈现",
        description: "来源是否被选中和展示",
        tone: "green",
      },
    ],
    question: "已知页面可访问，回答没有引用也没有品牌，下一步应优先检查什么？",
    options: [
      { id: "a", text: "立即增加发布数量" },
      { id: "b", text: "检查问题相关性、片段质量和来源选择" },
      { id: "c", text: "把发布成功记为推荐成功" },
      { id: "d", text: "只修改页面配色" },
    ],
    correctOptionId: "b",
    hint: "发布回链只证明发布动作完成，继续查看链路中尚未确认的节点。",
    analysis:
      "可访问性已经确认，下一批证据应落在相关性、可抽取片段和来源选择。增加数量会放大尚未定位的问题。",
    optionAnalyses: {
      a: "数量无法定位当前链路断点。",
      b: "正确。这三项紧接在可访问性之后。",
      c: "发布和推荐是两个独立状态。",
      d: "配色与当前证据链没有直接关系。",
    },
  }),
  lesson({
    number: 3,
    title: "GEO、SEO 与 AEO 如何协同",
    goal: "按目标和验收方式划分 SEO、AEO、GEO 与共享底座。",
    estimatedMinutes: 14,
    artifact: "澄屿搜索协同边界卡",
    scenario:
      "顾言希望把原 SEO 月报改名为 GEO 月报，继续沿用收录、排名和关键词密度。",
    wrongPath:
      "只改报告标题，指标和工作内容没有变化，答案覆盖、引用与品牌表达无人负责。",
    yishanMethod:
      "保留官网技术基础，同时增加问题池、知识资产、信源组合和答案监测；共享产物明确责任人。",
    principle: "三类工作共享内容和技术底座，目标、观测对象与验证方式各有重点。",
    modelTitle: "搜索协同边界",
    modelCaption: "先看任务最终验证网页表现、答案表现，还是共同资产。",
    modelNodes: [
      { label: "SEO", description: "收录、排名与站点基础", tone: "blue" },
      { label: "AEO", description: "直接回答与结构化", tone: "amber" },
      { label: "GEO", description: "答案覆盖、引用和品牌", tone: "violet" },
      { label: "共享底座", description: "事实、内容和技术资产", tone: "green" },
    ],
    question: "“监测品牌是否被 AI 回答引用”主要归入哪一类任务？",
    options: [
      { id: "a", text: "只归入传统网页收录" },
      { id: "b", text: "只归入页面速度优化" },
      { id: "c", text: "归入 GEO 答案与引用监测" },
      { id: "d", text: "无需归类" },
    ],
    correctOptionId: "c",
    hint: "看这项任务最终观测的是网页状态还是答案状态。",
    analysis:
      "引用监测直接观察生成式答案选择了哪些来源，属于 GEO 的核心观测面，同时依赖 SEO 和内容资产提供底座。",
    optionAnalyses: {
      a: "收录只说明页面可被发现。",
      b: "速度是技术基础，无法回答引用结果。",
      c: "正确。任务的验收对象是 AI 答案中的引用。",
      d: "没有责任归属会让监测结果无法进入行动。",
    },
  }),
  lesson({
    number: 4,
    title: "结论能走多远，取决于证据",
    goal: "根据样本、字段、时间和平台确定结论范围。",
    estimatedMinutes: 16,
    artifact: "澄屿数据判断卡",
    scenario:
      "唐策只有单平台、单周快照，客户要求预测全部平台未来趋势，并直接复制其他行业的实验结论。",
    wrongPath:
      "把局部实验和静态快照写成跨行业、跨平台规律，客户追问时无法回到原始字段。",
    yishanMethod:
      "使用已有数据、可以判断、需要限定、当前不支持、下一步补采五格卡，逐条标明范围。",
    principle:
      "结论强度受样本、字段、时间、平台与对照条件共同约束。增加一个范围就要增加相应证据。",
    modelTitle: "证据边界阶梯",
    modelCaption: "字段越完整、样本越稳定、对照越清楚，结论才能逐级增强。",
    modelNodes: [
      { label: "观察", description: "描述当前样本", tone: "blue" },
      { label: "限定结论", description: "写明平台和时间", tone: "amber" },
      { label: "可验证推断", description: "补齐对照与重复采样", tone: "green" },
    ],
    question: "单平台一周快照最适合支持哪种表述？",
    options: [
      { id: "a", text: "所有平台未来都会持续上升" },
      { id: "b", text: "该方法适用于全部行业" },
      { id: "c", text: "本次变化由新内容唯一造成" },
      { id: "d", text: "该平台在这一周的样本中出现了观察到的变化" },
    ],
    correctOptionId: "d",
    hint: "检查表述有没有增加平台、时间方向或因果关系。",
    analysis:
      "静态快照可以描述当前样本。趋势、迁移与因果都需要更多时间点、平台、行业条件和对照。",
    optionAnalyses: {
      a: "样本没有覆盖其他平台和未来时间。",
      b: "跨行业迁移需要保留行业与任务条件。",
      c: "没有对照，替代解释仍然存在。",
      d: "正确。平台、时间和样本范围都被保留。",
    },
  }),
  lesson({
    number: 5,
    title: "从泛词走到真实用户问题",
    goal: "把宽泛关键词拆成角色、场景、意图和可监测问句。",
    estimatedMinutes: 16,
    artifact: "澄屿用户问题地图",
    scenario:
      "客户提交“节能、余热、热泵”等泛词，希望全部覆盖。销售、产品和客服材料里出现了不同采购问题。",
    wrongPath: "按搜索量堆出巨大词表，业务目标、内容任务和监测问题无法对齐。",
    yishanMethod:
      "按品牌、品类、比较、决策和风险纠偏组织问题池，再用真实性、业务价值、可执行性和可监测性排序。",
    principle:
      "有效问题需要说明谁在什么场景下完成哪项决定，问题表达随后才能连接知识、内容与监测。",
    modelTitle: "从业务目标到监测问句",
    modelCaption: "每层都缩小范围，最终形成可以生产内容和重复采集的问题。",
    modelNodes: [
      { label: "业务目标", description: "项目希望改变什么", tone: "blue" },
      {
        label: "角色与场景",
        description: "谁在何时做哪项决定",
        tone: "violet",
      },
      { label: "用户意图", description: "决策背后的信息需要", tone: "amber" },
      { label: "监测问句", description: "可重复提问与比较", tone: "green" },
    ],
    question: "哪条问句最适合进入首轮采购问题池？",
    options: [
      { id: "a", text: "热泵" },
      { id: "b", text: "水泥厂余热改造选择热泵时应比较哪些运行条件？" },
      { id: "c", text: "节能很好吗？" },
      { id: "d", text: "所有工业技术" },
    ],
    correctOptionId: "b",
    hint: "补全角色、场景和要完成的决定。",
    analysis:
      "采购问句需要明确行业场景、对象和比较任务，这样才能连接事实卡、内容生产和后续监测。",
    optionAnalyses: {
      a: "只有品类词，没有采购任务。",
      b: "正确。角色场景和比较任务都清楚。",
      c: "问题范围过宽，也缺少验收维度。",
      d: "范围无法转成具体内容动作。",
    },
  }),
  lesson({
    number: 6,
    title: "把品牌事实变成可靠知识卡",
    goal: "区分事实、主张、证据和待确认信息，处理口径冲突。",
    estimatedMinutes: 16,
    artifact: "澄屿证据与知识卡包",
    scenario:
      "官网、产品手册和销售话术对同一性能参数给出三个数字，内部测试记录还包含未公开条件。",
    wrongPath: "直接把销售 PPT 写进母稿，旧口径、测试条件和公开权限一起丢失。",
    yishanMethod:
      "记录冲突、来源等级、适用范围和客户确认，确认后更新可用状态，并保留旧口径停用记录。",
    principle:
      "可靠知识资产需要一致、可验证、可更新和可追溯。可信度与公开权限需要分别判断。",
    modelTitle: "知识卡剖面",
    modelCaption: "每条对外事实都能回到来源、审核和可用范围。",
    modelNodes: [
      {
        label: "证据与来源",
        description: "版本、条件与可信等级",
        tone: "amber",
      },
      { label: "事实", description: "可核验的品牌信息", tone: "blue" },
      {
        label: "表达主张",
        description: "事实支持的对外说法",
        tone: "violet",
      },
      {
        label: "审核与缺口",
        description: "公开边界与待确认项",
        tone: "green",
      },
    ],
    question: "三份材料中的参数冲突时，正确处理顺序是什么？",
    options: [
      { id: "a", text: "选最大的数字直接发布" },
      { id: "b", text: "优先采用销售话术" },
      { id: "c", text: "先记录冲突和来源，再确认正式口径与可用范围" },
      { id: "d", text: "删除所有历史记录" },
    ],
    correctOptionId: "c",
    hint: "来源可信度、公开权限和版本先后是三个独立判断。",
    analysis:
      "冲突需要留下完整来源和版本，再由授权人员确认对外口径。旧记录保留停用状态，后续才能解释变化。",
    optionAnalyses: {
      a: "数值大小不能决定真实性。",
      b: "销售话术仍需事实和公开权限复核。",
      c: "正确。冲突和责任链都得到保存。",
      d: "删除记录会破坏追溯和版本解释。",
    },
  }),
  lesson({
    number: 7,
    title: "写出 AI 易理解、易抽取的内容",
    goal: "围绕问题组织直接回答、事实、证据、条件和边界。",
    estimatedMinutes: 18,
    artifact: "澄屿第一份内容结构稿",
    scenario:
      "一篇初稿堆满术语、标题和关键词，单独截取任何一段都看不出它回答什么，也找不到证据。",
    wrongPath:
      "继续追求固定字数和关键词密度，内容仍缺少直接答案、事实依据和限定条件。",
    yishanMethod:
      "从目标问题出发，安排直接回答、定义、条件、证据、例子和边界，并由人工完成事实复核。",
    principle:
      "结构帮助检索、切分、抽取和复用。事实准确与语义连续仍然决定内容能否可信使用。",
    modelTitle: "可审核答案单元",
    modelCaption: "单元可以独立理解，也能和上下文保持连续。",
    modelNodes: [
      { label: "目标问题", description: "明确要回答的决策", tone: "blue" },
      {
        label: "直接回答",
        description: "先给出可独立理解的结论",
        tone: "violet",
      },
      {
        label: "事实与证据",
        description: "关键主张紧邻可追来源",
        tone: "amber",
      },
      { label: "边界与复核", description: "条件可见、责任清楚", tone: "green" },
    ],
    question: "哪种内容结构最适合进入可审核母稿？",
    options: [
      { id: "a", text: "关键词重复、结论清楚、来源省略" },
      { id: "b", text: "直接回答、证据贴近、条件可见、人工复核" },
      { id: "c", text: "只对模型可见的诱导文字" },
      { id: "d", text: "固定字数切段，不保留上下文" },
    ],
    correctOptionId: "b",
    hint: "单独截取这个答案单元时，应能知道它回答什么、依据什么、适用于哪里。",
    analysis:
      "内容结构要服务理解和审核。直接回答、贴近证据、可见边界和人工复核共同构成可用单元。",
    optionAnalyses: {
      a: "来源省略后无法判断事实真实性。",
      b: "正确。答案、证据和审核链完整。",
      c: "隐蔽诱导违反白帽和用户可见原则。",
      d: "固定字数可能切断完整事实。",
    },
  }),
  lesson({
    number: 8,
    title: "设计可信且适配平台的信源组合",
    goal: "按来源角色、问题覆盖、平台差异和风险配置首轮信源。",
    estimatedMinutes: 18,
    artifact: "澄屿信源组合表",
    scenario:
      "顾言希望把预算集中到一个当前引用最多的平台，并购买大量低价发布。",
    wrongPath:
      "单一平台和单一指标决定全部投入，核心问题覆盖、第三方验证和风险被忽略。",
    yishanMethod:
      "用官网建设事实底座，引入解释源、验证源和分发源，再根据行业、预算、平台表现和反馈调整比例。",
    principle:
      "来源选择受相关性、权威性、可获取性、可抽取性、平台偏好和合规风险共同影响。",
    modelTitle: "四层信源图谱",
    modelCaption: "每种来源承担明确角色，组合效果按目标问题与平台分别观测。",
    modelNodes: [
      { label: "事实源", description: "官网与正式资料", tone: "blue" },
      {
        label: "解释源",
        description: "行业媒体和专业内容",
        tone: "amber",
      },
      {
        label: "验证源",
        description: "标准、数据和第三方证据",
        tone: "violet",
      },
      { label: "分发源", description: "面向目标问题触达平台", tone: "green" },
    ],
    question: "固定预算下，哪种首轮信源方案更稳妥？",
    options: [
      { id: "a", text: "全部投向当前引用最多的一个域名" },
      { id: "b", text: "只采购最低价发布" },
      { id: "c", text: "官网事实底座加第三方验证，并按目标问题分配平台" },
      { id: "d", text: "只看引用次数，不检查风险" },
    ],
    correctOptionId: "c",
    hint: "检查方案是否把全部目标压在单一域名、平台或指标上。",
    analysis:
      "首轮组合要同时承担事实、解释、验证和分发角色，投入依据是目标问题覆盖、平台差异和风险。",
    optionAnalyses: {
      a: "单一域名无法覆盖不同问题与平台。",
      b: "价格不能替代来源质量和合规判断。",
      c: "正确。底座、交叉验证和平台配置都齐备。",
      d: "高引用也可能来自低置信来源。",
    },
  }),
  lesson({
    number: 9,
    title: "建立从结果到过程的指标树",
    goal: "区分结果、过程、质量和归因指标，并写清分母与时间窗。",
    estimatedMinutes: 16,
    artifact: "澄屿 GEO 指标树",
    scenario:
      "周报把可见度、TOP3、引用率和发布量放在同一层，客户认为这些数字可以互换。",
    wrongPath: "用发布量替代效果、用引用率替代推荐率、用一次位置代表稳定表现。",
    yishanMethod:
      "为每个指标记录对象、分子、分母、去重、有效链接、平台、时间窗和数据源，并保留清洗前后数量。",
    principle:
      "可见、位置、引用和表达是不同观察面。过程指标用于解释结果变化，计算口径必须能够复算。",
    modelTitle: "GEO 四层指标树",
    modelCaption: "业务结果向下连接答案、引用、生产与投放，每层回答不同问题。",
    modelNodes: [
      { label: "业务结果", description: "客户最终关心的变化", tone: "green" },
      { label: "答案结果", description: "出现、位置和表达", tone: "blue" },
      { label: "引用过程", description: "来源进入答案的情况", tone: "amber" },
      { label: "生产投放", description: "内容与发布动作", tone: "violet" },
    ],
    question: "一个可复算的引用率至少还需要明确什么？",
    options: [
      { id: "a", text: "分子、分母、去重、平台和时间窗" },
      { id: "b", text: "报告封面颜色" },
      { id: "c", text: "客户是否喜欢这个数字" },
      { id: "d", text: "发布人员姓名即可" },
    ],
    correctOptionId: "a",
    hint: "另一位同事能否用相同原始数据算出同一个数字？",
    analysis:
      "分子与分母定义指标，去重、有效链接、平台和时间窗决定样本边界。缺少任何一项都可能得到不同结果。",
    optionAnalyses: {
      a: "正确。这些字段共同支持复算。",
      b: "视觉呈现不决定计算口径。",
      c: "偏好不能替代指标定义。",
      d: "责任记录有用，仍不足以复算。",
    },
  }),
  lesson({
    number: 10,
    title: "让采集结果可以复现",
    goal: "设计固定问题、多轮采样、上下文隔离和原始证据留存。",
    estimatedMinutes: 18,
    artifact: "澄屿多平台采集方案",
    scenario:
      "客户发来一张当天排名靠前的截图，要求写进月报。截图没有账号、模型版本、问题文本和上下文记录。",
    wrongPath: "用单次截图做趋势判断，第二天结果变化后无法解释采集条件。",
    yishanMethod:
      "固定问题版本、平台、环境、时间窗、重复次数和上下文规则，保留完整原始回答；自动评判加入人工金标与失败回退。",
    principle:
      "AI 回答受到随机性、个性化和上下文影响。比较结果前，需要固定变量或完整留痕。",
    modelTitle: "控制变量与多轮采样",
    modelCaption: "同一问题在一致条件下重复采样，趋势才能被复核。",
    modelNodes: [
      {
        label: "控制条件",
        description: "问题、账号、平台和上下文",
        tone: "blue",
      },
      {
        label: "多轮样本",
        description: "同一时间窗内重复回答",
        tone: "amber",
      },
      {
        label: "比较与留存",
        description: "对照回答、引用和采集环境",
        tone: "green",
      },
    ],
    question: "哪份采集计划更适合做月度比较？",
    options: [
      { id: "a", text: "每月任选一张有利截图" },
      { id: "b", text: "固定问题与环境，多轮采样并保留原始回答" },
      { id: "c", text: "每次更换问题和账号" },
      { id: "d", text: "只保存最终分数" },
    ],
    correctOptionId: "b",
    hint: "两次结果要能比较，采集条件与原始证据需要对齐。",
    analysis:
      "固定变量、多轮采样和原始留存共同支持复现。只保留截图或分数会丢失上下文和复核依据。",
    optionAnalyses: {
      a: "选择性截图会放大偶然结果。",
      b: "正确。采集条件与证据链都完整。",
      c: "输入持续变化后无法比较。",
      d: "分数无法还原回答、引用和评判过程。",
    },
  }),
  lesson({
    number: 11,
    title: "从相关变化走到可信归因",
    goal: "识别替代解释和因果越界，写出可信业务结论。",
    estimatedMinutes: 18,
    artifact: "澄屿数据结论单",
    scenario:
      "新内容发布后引用率上升，同时平台更新模型，竞品也减少投放。客户询问增长是否全部来自新内容。",
    wrongPath: "把时间先后写成确定因果，忽略同时发生的平台和竞品变化。",
    yishanMethod:
      "先描述共同发生的事实，再检查对照、时间窗、机制证据和替代解释，最后安排下一轮验证。",
    principle:
      "归因强度可以按相关、机制支持、对照验证和因果判断逐级提升。每一级需要新增证据。",
    modelTitle: "归因证据阶梯",
    modelCaption: "保留替代解释，结论强度和证据强度保持一致。",
    modelNodes: [
      { label: "相关变化", description: "时间上共同发生", tone: "blue" },
      {
        label: "机制支持",
        description: "动作与结果存在可解释链路",
        tone: "amber",
      },
      { label: "对照验证", description: "排除主要替代解释", tone: "green" },
      {
        label: "限定归因",
        description: "按证据范围表达影响",
        tone: "violet",
      },
    ],
    question: "当前证据下，哪种月报结论最合适？",
    options: [
      { id: "a", text: "新内容确定带来全部增长" },
      { id: "b", text: "观察到发布与引用率同期变化，平台更新等因素仍需验证" },
      { id: "c", text: "平台更新一定没有影响" },
      { id: "d", text: "无需记录其他变化" },
    ],
    correctOptionId: "b",
    hint: "寻找同一时间发生的其他变化，并检查是否有对照。",
    analysis:
      "当前可以报告同期变化，并标记平台更新和竞品动作等替代解释。确定归因需要对照和更多机制证据。",
    optionAnalyses: {
      a: "缺少对照，无法排除其他变化。",
      b: "正确。观察结果与结论边界一致。",
      c: "平台更新是需要验证的替代解释。",
      d: "遗漏共同变化会让结论失真。",
    },
  }),
  lesson({
    number: 12,
    title: "把诊断变成可执行优先级",
    goal: "在预算和人员限制下，用影响、证据、可控性、成本和风险排序。",
    estimatedMinutes: 18,
    artifact: "澄屿诊断与优先级矩阵",
    scenario:
      "团队发现 18 个问题，客户希望 90 天内全部解决，现有人员只能承担四项首月动作。",
    wrongPath: "直接开始内容生产，诊断范围、平台、验收口径和责任人保持空白。",
    yishanMethod:
      "按影响、证据、可控性、成本和风险评分，分为优先、试验、观察和暂缓，并记录触发条件。",
    principle:
      "优先级是资源约束下的业务选择。高影响仍需具备证据、执行条件和可复核结果。",
    modelTitle: "影响与可控性矩阵",
    modelCaption: "风险和证据置信度叠加后，动作进入四种处理区。",
    modelNodes: [
      {
        label: "试验",
        description: "高影响、可控性仍需验证",
        tone: "amber",
      },
      {
        label: "优先",
        description: "高影响、高可控、证据充分",
        tone: "green",
      },
      {
        label: "暂缓",
        description: "低影响、条件不足，记录触发条件",
        tone: "blue",
      },
      {
        label: "观察",
        description: "可执行，影响或证据仍需采样",
        tone: "violet",
      },
    ],
    question: "首月动作进入“优先”区，需要同时满足什么？",
    options: [
      { id: "a", text: "客户提过一次即可" },
      { id: "b", text: "影响高、证据足、可执行，并有责任人与验收" },
      { id: "c", text: "成本最高" },
      { id: "d", text: "不需要记录暂缓事项" },
    ],
    correctOptionId: "b",
    hint: "高影响动作还要检查证据、执行条件和项目范围。",
    analysis:
      "优先动作需要连接业务目标、已有证据、资源条件、责任人和可复核结果。暂缓项也要记录触发条件。",
    optionAnalyses: {
      a: "单次需求没有提供执行证据。",
      b: "正确。价值、证据和执行条件完整。",
      c: "成本高不会自然带来优先级。",
      d: "暂缓记录能防止问题被遗忘或反复讨论。",
    },
  }),
  lesson({
    number: 13,
    title: "接住项目：从销售交接到首周计划",
    goal: "确认范围、角色、资料、口径、客户待办和首个里程碑。",
    estimatedMinutes: 18,
    artifact: "澄屿项目启动包",
    scenario:
      "合同、聊天记录和客户资料对项目范围有三种表述，客户群两小时后建立。",
    wrongPath: "先承诺发布时间，资料权限、审核人和范围差异留到生产中处理。",
    yishanMethod:
      "完成内部交接、项目建档、启动会、资料分级、口径冲突表和首周计划，建立责任链与升级路径。",
    principle:
      "项目记忆依靠台账、版本和责任链保存。前置确认可以减少后续生产、发布与验收的返工。",
    modelTitle: "首周关键路径",
    modelCaption: "会前补输入，会中定范围和责任，会后形成可执行记录。",
    modelNodes: [
      { label: "会前", description: "交接、资料和冲突清单", tone: "blue" },
      { label: "会中", description: "目标、范围、角色和节点", tone: "amber" },
      { label: "会后", description: "待办、台账和首周计划", tone: "green" },
    ],
    question: "客户启动会前最需要先确认哪一组信息？",
    options: [
      { id: "a", text: "范围差异、审核人、资料权限和首个里程碑" },
      { id: "b", text: "先承诺全部发布时间" },
      { id: "c", text: "只准备会议背景图" },
      { id: "d", text: "把冲突留给生产人员" },
    ],
    correctOptionId: "a",
    hint: "检查哪些信息缺失后，生产、发布或验收会无法继续。",
    analysis:
      "范围、审核、权限和里程碑决定项目能否进入执行。会前记录差异，可以在启动会上完成确认。",
    optionAnalyses: {
      a: "正确。这组信息直接决定首周动作。",
      b: "输入尚未确认，时间承诺缺少依据。",
      c: "视觉材料无法替代项目输入。",
      d: "晚处理会把范围冲突带入生产。",
    },
  }),
  lesson({
    number: 14,
    title: "让问题、知识和任务进入同一条生产线",
    goal: "连接问题池、QMap、Card Pack、内容任务和监测项。",
    estimatedMinutes: 18,
    artifact: "澄屿六阶段路线图与 QMap",
    scenario:
      "项目已有 40 个问题和 120 份材料，团队围绕先读材料还是先写内容持续争论。",
    wrongPath: "按文件夹逐份处理材料，目标问题、内容和监测之间没有稳定映射。",
    yishanMethod:
      "从目标问题倒推实体、知识卡、内容任务和监测项，空字段进入 Fill Plan，归位结果经人工确认后写入。",
    principle:
      "结构化项目资产可以保存上下文，让不同角色围绕同一问题和事实协作。",
    modelTitle: "问题到监测的生产管道",
    modelCaption:
      "材料服务目标问题，缺口进入补充清单，任务顺序由业务目标决定。",
    modelNodes: [
      { label: "QMap", description: "目标问题与实体", tone: "blue" },
      { label: "Card Pack", description: "事实、证据和缺口", tone: "amber" },
      {
        label: "内容任务",
        description: "把事实转成可审核母稿",
        tone: "violet",
      },
      { label: "监测项", description: "问题、平台、口径与结果", tone: "green" },
    ],
    question: "建立生产线关系时，最合适的起点是什么？",
    options: [
      { id: "a", text: "材料文件名" },
      { id: "b", text: "目标问题和最终监测任务" },
      { id: "c", text: "随机选择一份材料" },
      { id: "d", text: "先生成全部文章" },
    ],
    correctOptionId: "b",
    hint: "从最终要回答和监测的问题倒推知识与内容。",
    analysis:
      "目标问题决定需要哪些事实、内容和监测。材料只有进入这条关系链后，才能形成可执行任务。",
    optionAnalyses: {
      a: "文件名不代表业务优先级。",
      b: "正确。生产与监测共享同一目标。",
      c: "随机顺序会制造上下文和范围浪费。",
      d: "缺少事实与目标映射会放大返工。",
    },
  }),
  lesson({
    number: 15,
    title: "从 Card Pack 到可投母稿",
    goal: "完成生成、人工审核、事实追溯和生产日志。",
    estimatedMinutes: 18,
    artifact: "澄屿母稿与审核单",
    scenario:
      "AI 初稿出现无法回查的性能数字和一段隐蔽诱导指令，客户希望当天投放。",
    wrongPath:
      "只检查错别字和排版，事实、竞品表述、重复度和合规问题进入发布环节。",
    yishanMethod:
      "确认目标问题、内容类型、受众和来源，再完成事实、结构、信源、品牌与合规审核。夸大事实和隐蔽诱导直接阻断发布。",
    principle:
      "AI 可以加速生产，发布责任由可识别的人和审核记录承担。每项外部主张都需要追溯来源。",
    modelTitle: "母稿五道审核门",
    modelCaption:
      "事实、证据、品牌、合规和人工放行依次检查，任一阻断项都会暂停发布。",
    modelNodes: [
      { label: "事实准确", description: "主张与材料一致", tone: "blue" },
      { label: "证据可追", description: "来源和版本明确", tone: "green" },
      { label: "品牌一致", description: "名称、口径和表达统一", tone: "amber" },
      { label: "合规授权", description: "权限和风险受控", tone: "violet" },
      { label: "人工放行", description: "责任人与日志完整", tone: "green" },
    ],
    question: "发现无法回查的性能数字时，应如何处理？",
    options: [
      { id: "a", text: "保留数字以增强说服力" },
      { id: "b", text: "先发布，后续再补来源" },
      { id: "c", text: "修改字体让它不显眼" },
      { id: "d", text: "阻断发布，回查来源或删除主张并重新审核" },
    ],
    correctOptionId: "d",
    hint: "逐句追问事实来源、公开权限和对外风险。",
    analysis:
      "无法追溯的外部主张不能通过审核。处理动作和再次验收需要写入生产日志。",
    optionAnalyses: {
      a: "说服力无法替代真实性。",
      b: "先发布会把未确认风险转给客户。",
      c: "视觉处理不会解决事实问题。",
      d: "正确。发布边界和复核记录都得到保留。",
    },
  }),
  lesson({
    number: 16,
    title: "从发布回链到引用追踪",
    goal: "在预算和授权约束下完成投放、回链与引用检测。",
    estimatedMinutes: 18,
    artifact: "澄屿投放与引用账本",
    scenario:
      "六篇母稿等待投放，其中一篇图片与图注指向不同型号，客户临时增加平台并希望省略二次确认。",
    wrongPath:
      "把发布成功记成项目结果，成本、授权、回链和检测任务没有进入台账。",
    yishanMethod:
      "先完成图文一致性和发布前审核，再校验媒体、预算和花钱动作，保存发布回链，最后同步引用检测。",
    principle:
      "发布、可访问、被选择、被引用和进入答案是连续的独立状态，需要分别记录。",
    modelTitle: "发布到引用状态机",
    modelCaption:
      "每个状态都有责任人、证据和异常处理，发布回链连接执行与监测。",
    modelNodes: [
      { label: "发布确认", description: "授权、预算与图文一致", tone: "blue" },
      { label: "可访问", description: "回链有效并保留执行记录", tone: "amber" },
      {
        label: "被选择",
        description: "页面进入候选来源集合",
        tone: "violet",
      },
      {
        label: "被引用",
        description: "来源出现在目标问题答案中",
        tone: "green",
      },
      {
        label: "进入表达",
        description: "品牌事实被准确组织和呈现",
        tone: "blue",
      },
    ],
    question: "发布完成后，哪项记录可以连接投放与后续检测？",
    options: [
      { id: "a", text: "发布回链、平台、时间和检测批次" },
      { id: "b", text: "只记录文章标题" },
      { id: "c", text: "删除预算确认" },
      { id: "d", text: "把发布成功记为已被引用" },
    ],
    correctOptionId: "a",
    hint: "每次发布都要能回答发到哪里、怎样回查、何时检测。",
    analysis:
      "发布回链是执行证据，平台、时间和检测批次让后续采集能够定位同一对象。引用仍需独立检测。",
    optionAnalyses: {
      a: "正确。投放与监测形成可追溯关系。",
      b: "标题无法证明真实发布和访问状态。",
      c: "付费动作需要明确授权记录。",
      d: "发布和引用是两个独立状态。",
    },
  }),
  lesson({
    number: 17,
    title: "把结果回流到下一轮",
    goal: "比较高引用与未引用样本，形成内容、信源、知识和预算动作。",
    estimatedMinutes: 18,
    artifact: "澄屿月度归因复盘单",
    scenario: "首月结束，部分文章在多个平台被引用，另一些发布后持续没有信号。",
    wrongPath: "只增加发布数量，高价值样本和失败原因没有进入团队资产。",
    yishanMethod:
      "按内容、信源、平台、预算和问题匹配检查原因，把有效经验回流到好文章库、Card Pack 和下一轮策略。",
    principle:
      "发布前判断与发布后证据共同修正下一轮动作。预测保持概率表达，并通过新样本持续更新。",
    modelTitle: "监测到再验证闭环",
    modelCaption: "观察结果进入解释和决策，随后回流资产并接受下一轮验证。",
    modelNodes: [
      {
        label: "监测结果",
        description: "记录样本、答案与引用变化",
        tone: "blue",
      },
      {
        label: "诊断原因",
        description: "比较样本并保留替代解释",
        tone: "amber",
      },
      {
        label: "修正资产",
        description: "保留、修订、换源或暂停",
        tone: "violet",
      },
      { label: "再验证", description: "新一轮采样更新判断", tone: "green" },
    ],
    question: "一篇文章持续未被引用，下一步最合适的做法是什么？",
    options: [
      { id: "a", text: "直接认定内容失败" },
      { id: "b", text: "检查内容、信源、平台、问题匹配和采样证据" },
      { id: "c", text: "立即复制十篇相同内容" },
      { id: "d", text: "删除失败样本" },
    ],
    correctOptionId: "b",
    hint: "相同结果可能来自内容、信源、平台或采样，先确认缺少哪类证据。",
    analysis:
      "未引用是一个结果，原因可能来自多个环节。保留样本并选择最小验证动作，才能让复盘进入下一轮。",
    optionAnalyses: {
      a: "单一结果不足以定位原因。",
      b: "正确。诊断覆盖主要替代解释。",
      c: "复制会扩大尚未定位的问题。",
      d: "失败样本是复盘和归因的重要证据。",
    },
  }),
  lesson({
    number: 18,
    title: "和客户讲清目标、波动与边界",
    goal: "识别客户真实关注，说明证据、边界、可控动作和确认节点。",
    estimatedMinutes: 16,
    artifact: "澄屿月会沟通纪要",
    scenario:
      "月会上，顾言连续追问昨天为什么下降、能否保证下月第一、是否只做一个平台。",
    wrongPath: "用一张有利截图安抚客户，或在信息不足时给出确定承诺。",
    yishanMethod:
      "先定义概念与口径，复述真实关注，再说明已有证据、当前边界、可控动作和确认节点。",
    principle:
      "持续一致的专业判断、透明过程和问题闭环会形成信任。动态结果需要连接可控过程。",
    modelTitle: "客户问题沟通沙漏",
    modelCaption: "从表层问题进入真实关注，再回到证据、边界和下一步。",
    modelNodes: [
      {
        label: "表层问题",
        description: "先完整接住客户原话",
        tone: "violet",
      },
      { label: "真实关注", description: "风险、投入或决策压力", tone: "blue" },
      {
        label: "证据与边界",
        description: "已知、未知和波动来源",
        tone: "amber",
      },
      {
        label: "行动与确认",
        description: "负责人、节点和下一步",
        tone: "green",
      },
    ],
    question: "客户要求保证下月第一，哪种回应更合适？",
    options: [
      { id: "a", text: "直接保证结果" },
      { id: "b", text: "展示一张最有利截图" },
      { id: "c", text: "说明动态结果边界，给出可控动作、监测口径和确认节点" },
      { id: "d", text: "回避问题" },
    ],
    correctOptionId: "c",
    hint: "先回应客户担心的风险，再回到证据和可控动作。",
    analysis:
      "排名和答案受平台变化影响，无法作确定承诺。专业回应需要解释边界，并把讨论带到可执行动作和复核节点。",
    optionAnalyses: {
      a: "动态结果缺少可控的保证条件。",
      b: "选择性证据会破坏长期信任。",
      c: "正确。关注、证据和行动被连接起来。",
      d: "回避会让客户的真实风险继续悬空。",
    },
  }),
  lesson({
    number: 19,
    title: "守住白帽、隐私与异常处理边界",
    goal: "识别投毒、虚假攻击、敏感外发、权限越界和异常发布。",
    estimatedMinutes: 18,
    artifact: "澄屿风险与治理清单",
    scenario:
      "外部供应商提供批量虚构问答和竞品负面内容，待发布文件还含客户内部价格，低置信新域名频繁进入检索。",
    wrongPath: "以短期曝光作为唯一目标，未授权资料和高风险来源自动进入发布。",
    yishanMethod:
      "坚持真实事实、可信信源、人工审核、最小权限、变更留痕和异常升级，明确阻断与恢复条件。",
    principle:
      "白帽 GEO 建设可验证知识资产。虚假、越权、投毒和攻击需要保全证据并沿责任链处理。",
    modelTitle: "风险识别与恢复链",
    modelCaption: "风险从诱因进入预防、处置和恢复，每个阶段都有明确责任。",
    modelNodes: [
      {
        label: "风险信号",
        description: "识别投毒、越权与异常发布",
        tone: "violet",
      },
      { label: "预防", description: "真实、授权和最小权限", tone: "blue" },
      { label: "即时处置", description: "阻断、隔离、保全证据", tone: "amber" },
      { label: "恢复", description: "责任人复核和条件确认", tone: "green" },
    ],
    question: "发现待发布文件含客户内部价格时，应先做什么？",
    options: [
      { id: "a", text: "阻断发布，保全记录并交由授权责任人复核" },
      { id: "b", text: "立即公开以抢占引用" },
      { id: "c", text: "只删除文件名" },
      { id: "d", text: "交给自动系统直接放行" },
    ],
    correctOptionId: "a",
    hint: "检查真实性、公开授权、可追溯性和对客户的长期风险。",
    analysis:
      "内部价格属于敏感信息，必须阻断外发、保留处置记录并由授权责任人确认恢复条件。",
    optionAnalyses: {
      a: "正确。信息、证据和责任链都得到保护。",
      b: "未授权外发会直接伤害客户。",
      c: "改文件名不会移除敏感内容。",
      d: "高风险场景需要人工复核。",
    },
  }),
  lesson({
    number: 20,
    title: "综合实战：完成 90 天 GEO 作战包",
    goal: "综合事实、方法、数据、交付和治理，形成下一季度方案。",
    estimatedMinutes: 30,
    artifact: "澄屿 90 天 GEO 作战包",
    scenario:
      "澄屿进入季度复盘，客户需要决定下一阶段是否继续合作和扩大范围。完整项目档案和预算约束已经开放。",
    wrongPath:
      "把下一季度方案写成发布数量清单，问题、知识、指标、归因、责任和治理没有连接。",
    yishanMethod:
      "选择目标平台与问题簇，补齐知识缺口，安排内容、信源、采集、风险和客户沟通节点，形成 90 天可验收路线图。",
    principle:
      "结业方案按事实、方法、数据、交付和治理五维确定性规则检查。关键治理项需要全部通过。",
    modelTitle: "90 天 GEO 综合工作台",
    modelCaption: "前 19 节成果物连接为一个可持续迭代的项目系统。",
    modelNodes: [
      { label: "目标与事实", description: "问题簇、事实和缺口", tone: "blue" },
      {
        label: "方法与内容",
        description: "策略、信源和生产任务",
        tone: "amber",
      },
      {
        label: "数据与归因",
        description: "采集、口径、对照和判断",
        tone: "violet",
      },
      {
        label: "交付与责任",
        description: "成果物、节点和负责人",
        tone: "green",
      },
      {
        label: "风险与治理",
        description: "授权、异常、恢复和沟通",
        tone: "green",
      },
    ],
    question: "哪套 90 天方案具备结业要求？",
    options: [
      { id: "a", text: "只承诺发布数量" },
      { id: "b", text: "目标、事实、动作、指标、责任和治理形成可验收关系" },
      { id: "c", text: "省略数据口径和异常升级" },
      { id: "d", text: "使用未授权资料换取短期曝光" },
    ],
    correctOptionId: "b",
    hint: "检查事实、方法、数据、交付和治理五个维度是否都能被复核。",
    analysis:
      "综合方案需要把目标问题、知识、内容与信源、采集归因、责任里程碑和风险治理连成一条可验收路线。",
    optionAnalyses: {
      a: "发布数量无法代表答案效果和业务价值。",
      b: "正确。五个维度和验收关系完整。",
      c: "缺少口径与升级路径会让结果无法复核。",
      d: "治理关键项失败时不能结业。",
    },
  }),
];

export const courseDefinition = {
  slug: "geo-foundations" as const,
  shortTitle: "GEO 实战训练营" as const,
  title: "从 AI 回答到 GEO 交付" as const,
  description:
    "跟随澄屿工业热能项目完成 20 节实战，把 AI 答案、知识建设、数据判断和项目运营连成一条可执行路线。",
  packProfile: "PILOT" as const,
  version: "pilot-1.0.0",
  certificateAvailable: false,
  estimatedMinutes: courseLessons.reduce(
    (total, item) => total + item.estimatedMinutes,
    0,
  ),
};

export const courseStepKeys = courseLessons.flatMap((item) => [
  `${item.key}-story`,
  `${item.key}-model`,
  `${item.key}-practice`,
]);

export function courseLessonByKey(key: string) {
  return courseLessons.find((item) => item.key === key);
}

export function courseStepIndex(key: string) {
  return courseStepKeys.indexOf(key);
}

export function courseStepFor(lesson: CourseLessonDefinition, stepKey: string) {
  if (stepKey === `${lesson.key}-story`)
    return {
      key: stepKey,
      lessonKey: lesson.key,
      position: 1,
      kind: "STORY" as const,
      eyebrow: `第 ${lesson.number} 节 · 进入背景`,
      title: lesson.title,
      intro: lesson.goal,
      actionLabel: lesson.storyActionLabel,
      sections: [
        {
          label: "项目现场",
          title: "澄屿发生了什么",
          body: lesson.scenario,
          tone: "neutral" as const,
        },
        {
          label: "错误路线",
          title: "这一步会把项目带偏",
          body: lesson.wrongPath,
          tone: "danger" as const,
        },
        {
          label: "移山做法",
          title: "把判断变成可复核动作",
          body: lesson.yishanMethod,
          tone: "success" as const,
        },
      ],
      model: null,
      exercise: null,
    };
  if (stepKey === `${lesson.key}-model`)
    return {
      key: stepKey,
      lessonKey: lesson.key,
      position: 2,
      kind: "MODEL" as const,
      eyebrow: `第 ${lesson.number} 节 · 底层原理`,
      title: lesson.modelTitle,
      intro: lesson.principle,
      actionLabel: lesson.modelActionLabel,
      sections: [
        {
          label: "判断依据",
          title: "这套方法为什么成立",
          body: lesson.principle,
          tone: "principle" as const,
        },
      ],
      model: {
        title: lesson.modelTitle,
        layout: lesson.modelLayout,
        ...modelMetadata[lesson.modelLayout],
        nodes: lesson.modelNodes.map((node) => {
          const semanticKey = lessonModelNodeKeys[lesson.number]?.[node.label];
          if (!semanticKey)
            throw new Error(
              `Missing semantic model node key for ${lesson.key}: ${node.label}`,
            );
          return {
            ...node,
            key: `${lesson.key}-model-${semanticKey}`,
          };
        }),
        caption: lesson.modelCaption,
      },
      exercise: null,
    };
  if (stepKey === `${lesson.key}-practice`)
    return {
      key: stepKey,
      lessonKey: lesson.key,
      position: 3,
      kind: "PRACTICE" as const,
      eyebrow: `第 ${lesson.number} 节 · 练一练`,
      title: "用一个判断完成本节",
      intro: `答对后完成本节，并把成果物“${lesson.artifact}”加入学习记录。`,
      actionLabel: "提交我的判断",
      sections: [],
      model: null,
      exercise: {
        key: `${lesson.key}-practice`,
        stem: lesson.question,
        options: lesson.options,
      },
    };
  return undefined;
}
