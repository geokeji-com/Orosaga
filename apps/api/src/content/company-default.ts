import type { CompanyContentPayload } from "@orosaga/contracts";

export const companyDefaultContent: CompanyContentPayload = {
  schemaVersion: 1,
  eyebrow: "Company & business · 公司与业务",
  title: "先把移山科技说清楚",
  lead: "这不是一份公司宣传册，而是一条新人理解业务的最短路径。先知道我们解决什么问题，再理解系统、运营和结果如何连在一起。",
  source: {
    label: "内容依据",
    name: "移山科技 AI 知识库 V3.0",
    date: "2026.06.23",
  },
  definition: {
    label: "30 秒版本",
    title: "移山科技是一家技术与运营双轮驱动的全链路 GEO 优化服务商。",
    description:
      "我们帮助品牌把分散的信息建设成 AI 能理解、能引用、能推荐的长期知识资产。",
  },
  facts: [
    { label: "成立", value: "2020 年 8 月 5 日" },
    { label: "所在", value: "北京总部 · 西安分公司" },
    { label: "服务对象", value: "重视长期品牌资产与可归因增长的企业" },
    { label: "核心主张", value: "让 AI 为您发声，让世界看见价值" },
  ],
  whyGeo: {
    heading: {
      kicker: "01 · Why GEO",
      title: "为什么会出现 GEO 这门业务？",
      description: "因为用户获取答案的方式变了，品牌竞争的位置也随之改变。",
    },
    journey: [
      {
        title: "搜索关键词",
        subtitle: "过去",
        description: "打开多个网页，自己比较和判断。",
        iconKey: "file",
      },
      {
        title: "直接询问 AI",
        subtitle: "现在",
        description: "让 AI 总结方案，并给出品牌建议。",
        iconKey: "network",
      },
      {
        title: "AI 会不会提到我？",
        subtitle: "品牌的新问题",
        description: "是否看见、理解、引用，并把品牌作为推荐对象。",
        iconKey: "radar",
      },
    ],
    definition:
      "不是“给 AI 写更多文章”，而是主动建设一套可被 AI 理解、引用和推荐的品牌知识资产，并持续验证它是否真正改变了 AI 回答。",
  },
  solution: {
    heading: {
      kicker: "02 · Our solution",
      title: "我们怎样把一个模糊问题变成可交付的服务",
      description: "方法很朴素：先发现问题，再建设资产，最后用数据持续优化。",
    },
    layers: [
      {
        title: "发现问题",
        description: "诊断品牌在 AI 搜索中的可见度、推荐、信源和表达差距。",
        iconKey: "file",
      },
      {
        title: "建设资产",
        description:
          "把官网、内容、案例等分散资料重构为统一的知识库和知识图谱。",
        iconKey: "network",
      },
      {
        title: "持续优化",
        description:
          "适配多平台，监测回答变化，完成归因并把有效经验带回下一轮。",
        iconKey: "chart",
      },
    ],
    wheels: [
      {
        title: "7 大数字化系统 + 20+ 优化 Agent",
        subtitle: "技术轮",
        description:
          "负责监测、采集、创作、信源分析、质量评估、策略生成和回答解析。",
        iconKey: "boxes",
      },
      {
        title: "标准化交付 + 多对一精细运营",
        subtitle: "运营轮",
        description:
          "负责理解客户业务、制定策略、把控事实、推动落地并持续复盘。",
        iconKey: "workflow",
      },
    ],
    systems: [
      {
        title: "移山洞察云",
        description: "持续追踪品牌在 AI 平台中的可见度与排名变化",
      },
      {
        title: "AI 信号采集器",
        description: "采集不同平台、不同问法下的真实 AI 回答",
      },
      {
        title: "GEO 智能创作台",
        description: "把品牌事实转成结构清晰、适配 AI 调用的内容",
      },
      {
        title: "信源图谱监测器",
        description: "观察 AI 引用哪些来源，以及信源格局如何变化",
      },
      {
        title: "内容质量雷达",
        description: "检查内容质量、事实一致性和 AI 可读性",
      },
      {
        title: "GEO 策略定制舱",
        description: "结合数据生成阶段策略与下一步动作",
      },
      {
        title: "AI 回答解析智能体",
        description: "拆解回答逻辑，帮助团队完成归因和复盘",
      },
    ],
  },
  delivery: {
    heading: {
      kicker: "03 · Delivery",
      title: "一项业务怎样从问题走到结果",
      description: "六个阶段不是线性交差，而是一个会反复校准的闭环。",
    },
    steps: [
      {
        title: "诊断",
        subtitle: "先看清问题",
        description:
          "扫描重点 AI 平台、竞争格局和品牌现状，识别可见度、推荐、信源与表达上的差距。",
        output: "GEO 诊断报告、机会清单、问题清单",
        iconKey: "file",
      },
      {
        title: "方案",
        subtitle: "把问题变成路线",
        description:
          "确定目标平台、关键词与问题簇，设计阶段目标、内容方向和信源布局。",
        output: "优化方案、执行路线图、内容与信源规划",
        iconKey: "route",
      },
      {
        title: "实施",
        subtitle: "开始建设资产",
        description:
          "搭建品牌知识库与知识图谱，生产结构化内容，并完成多平台适配和信源布局。",
        output: "知识库、知识图谱、结构化内容、发布记录",
        iconKey: "boxes",
      },
      {
        title: "监测",
        subtitle: "持续观察回答",
        description:
          "跟踪品牌在各 AI 平台的可见度、TOP 排名、引用情况和竞品变化。",
        output: "项目周报、平台表现数据、阶段问题清单",
        iconKey: "radar",
      },
      {
        title: "归因",
        subtitle: "解释为什么变化",
        description:
          "分析回答来源与结果变化，判断哪些内容、信源和平台动作真正发挥了作用。",
        output: "月度报告、归因分析、优化动作复盘",
        iconKey: "chart",
      },
      {
        title: "迭代",
        subtitle: "把结果带回下一轮",
        description:
          "根据数据更新知识、内容、信源和平台策略，让品牌认知资产持续积累。",
        output: "季度报告、下一阶段计划、策略迭代建议",
        iconKey: "workflow",
      },
    ],
    metrics: [
      { title: "可见度占比", description: "品牌有没有进入 AI 回答" },
      { title: "TOP1 / TOP3", description: "品牌在推荐位置上是否靠前" },
      { title: "AI 引用率", description: "品牌内容是否被 AI 作为依据" },
    ],
  },
  customers: {
    heading: {
      kicker: "04 · Customers & service",
      title: "谁会来找我们，他们真正需要什么",
      description:
        "我们更适合已经有品牌基础、业务复杂，并且重视长期效果的企业。",
    },
    fit: [
      {
        title: "已有品牌基础",
        description: "有官网、内容中心、媒体报道或行业资料，但信息分散。",
        iconKey: "building",
      },
      {
        title: "业务解释成本高",
        description: "产品复杂、决策链路长，需要被 AI 准确介绍和比较。",
        iconKey: "network",
      },
      {
        title: "重视可归因增长",
        description: "希望知道投入带来了什么变化，而不是只统计发文量。",
        iconKey: "chart",
      },
      {
        title: "看重可信与合规",
        description: "要求表达准确、过程可验证，不接受短期灰黑产打法。",
        iconKey: "clipboard",
      },
    ],
    modes: [
      {
        title: "GEO 1.0 · 季度合作",
        subtitle: "阶段验证",
        value: "30–90 天",
        description:
          "聚焦关键平台与问题场景，完成诊断、实施、监测和归因，用阶段结果验证 GEO 的价值。",
      },
      {
        title: "GEO 全流程 · 年度合作",
        subtitle: "长期建设",
        value: "12 个月+",
        description:
          "持续建设知识库、知识图谱和多平台认知资产，通过周报、月报和季度复盘长期迭代。",
      },
    ],
    note: "RaaS：Result as a Service｜把合作重心从“做了多少内容”转向“带来了多少可见变化”，围绕可追踪结果推进合作。",
  },
  proof: {
    heading: {
      kicker: "05 · Proof & boundary",
      title: "我们如何证明价值，也如何守住边界",
      description: "案例说明能力，边界保证可信。两者缺一不可。",
    },
    stats: [
      { label: "平均 AI 推荐率提升", value: "300%+" },
      { label: "交付成功率", value: "99%" },
      { label: "平均可见度相对提升", value: "85%+" },
      { label: "典型案例 TOP 排名平均提升", value: "约 320%" },
    ],
    cases: [
      {
        title: "0.14% → 75.74%",
        meta: "线下教育 · 27 天",
        description: "AI 可见度从几乎不可见，到进入主流推荐范围。",
      },
      {
        title: "7.6% → 44.5%",
        meta: "在线教育 · 21 天",
        description: "TOP1 占比提升，同时总体推荐率增长 450%。",
      },
      {
        title: "53% → 84.7%",
        meta: "母婴童车 · 2 个月",
        description: "项目总体可见度提升，推荐度与 TOP3 占比同步改善。",
      },
    ],
    disclaimer:
      "以上为知识库收录的匿名案例与历史数据，用于解释业务能力，不构成固定结果承诺。实际效果受品牌基础、平台状态、内容资产和执行周期影响。",
    boundaries: [
      {
        title: "我们坚持",
        description:
          "基于品牌事实、公开内容、结构化表达、可信信源、数据监测和可验证过程推进。",
        iconKey: "clipboard",
      },
      {
        title: "我们不做",
        description:
          "不做 GEO 投毒，不使用虚假信息，不恶意踩踏竞品，不用批量低质内容换短期曝光。",
        iconKey: "radar",
      },
    ],
    milestones: [
      { label: "2020", value: "北京移山科技有限公司成立。" },
      {
        label: "2025",
        value: "发布早期 GEO 行业白皮书，并参与行业早期运营执行标准建设。",
      },
      {
        label: "2026",
        value: "在北京发起“中国首届 GEO 大会”，并参与发起行业自律公约。",
      },
    ],
  },
  remember: {
    heading: {
      kicker: "06 · Newcomer checklist",
      title: "新人离开这一页前，至少记住五句话",
    },
    facts: [
      "移山科技是一家技术与运营双轮驱动的全链路 GEO 优化服务商。",
      "我们的目标不是多发内容，而是让品牌被 AI 准确理解、持续引用和优先推荐。",
      "项目按“诊断、方案、实施、监测、归因、迭代”形成闭环。",
      "核心结果指标是可见度占比、TOP1 / TOP3 占比和 AI 引用率。",
      "所有优化基于品牌事实、可信信源和可验证过程，坚持白帽与长期主义。",
    ],
  },
  faq: {
    heading: { kicker: "Quick answers", title: "最常被问到的五个问题" },
    items: [
      {
        question: "移山科技到底是做什么的？",
        answer:
          "我们帮助品牌改善在 DeepSeek、豆包、Kimi、通义千问、腾讯元宝等 AI 平台中的呈现，让品牌更容易被准确理解、引用和推荐。服务覆盖诊断、知识库、知识图谱、多平台适配、监测、归因与持续迭代。",
      },
      {
        question: "GEO 和传统 SEO 有什么不同？",
        answer:
          "传统 SEO 更关注关键词、网页和搜索排名；GEO 关注 AI 回答中的品牌理解、引用和推荐。它不是把 SEO 原样搬进 AI，而是围绕知识结构、可信信源、平台适配和效果归因重新组织品牌资产。",
      },
      {
        question: "客户已经做内容营销，为什么还需要 GEO？",
        answer:
          "内容营销解决“有没有内容、有没有传播”，GEO 进一步解决“这些内容能不能被 AI 理解、调用和推荐”。我们会把分散内容重构为口径统一、结构清晰、可持续复用的品牌知识资产。",
      },
      {
        question: "我们怎样判断项目有没有效果？",
        answer:
          "主要观察可见度占比、TOP1 / TOP3 占比和 AI 引用率，并通过归因分析判断哪些内容、信源和平台动作推动了结果变化。",
      },
      {
        question: "为什么不承诺固定排名或立即收录？",
        answer:
          "AI 平台、品牌基础、内容资产和竞争环境都在变化。专业交付应该给出可追踪的过程、指标和归因，而不是用不可控的固定结果承诺替代长期建设。",
      },
    ],
  },
};
