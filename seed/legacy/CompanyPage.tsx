import { useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  Bot,
  BrainCircuit,
  Building2,
  Check,
  ChevronDown,
  CircleDot,
  FileSearch,
  Gauge,
  Globe2,
  Layers3,
  Network,
  RefreshCw,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from 'lucide-react'

const deliverySteps = [
  {
    title: '诊断',
    subtitle: '先看清问题',
    description: '扫描重点 AI 平台、竞争格局和品牌现状，识别可见度、推荐、信源与表达上的差距。',
    output: 'GEO 诊断报告、机会清单、问题清单',
    icon: FileSearch,
  },
  {
    title: '方案',
    subtitle: '把问题变成路线',
    description: '确定目标平台、关键词与问题簇，设计阶段目标、内容方向和信源布局。',
    output: '优化方案、执行路线图、内容与信源规划',
    icon: Target,
  },
  {
    title: '实施',
    subtitle: '开始建设资产',
    description: '搭建品牌知识库与知识图谱，生产结构化内容，并完成多平台适配和信源布局。',
    output: '知识库、知识图谱、结构化内容、发布记录',
    icon: Layers3,
  },
  {
    title: '监测',
    subtitle: '持续观察回答',
    description: '跟踪品牌在各 AI 平台的可见度、TOP 排名、引用情况和竞品变化。',
    output: '项目周报、平台表现数据、阶段问题清单',
    icon: Gauge,
  },
  {
    title: '归因',
    subtitle: '解释为什么变化',
    description: '分析回答来源与结果变化，判断哪些内容、信源和平台动作真正发挥了作用。',
    output: '月度报告、归因分析、优化动作复盘',
    icon: SearchCheck,
  },
  {
    title: '迭代',
    subtitle: '把结果带回下一轮',
    description: '根据数据更新知识、内容、信源和平台策略，让品牌认知资产持续积累。',
    output: '季度报告、下一阶段计划、策略迭代建议',
    icon: RefreshCw,
  },
]

const systemCapabilities = [
  ['移山洞察云', '持续追踪品牌在 AI 平台中的可见度与排名变化'],
  ['AI 信号采集器', '采集不同平台、不同问法下的真实 AI 回答'],
  ['GEO 智能创作台', '把品牌事实转成结构清晰、适配 AI 调用的内容'],
  ['信源图谱监测器', '观察 AI 引用哪些来源，以及信源格局如何变化'],
  ['内容质量雷达', '检查内容质量、事实一致性和 AI 可读性'],
  ['GEO 策略定制舱', '结合数据生成阶段策略与下一步动作'],
  ['AI 回答解析智能体', '拆解回答逻辑，帮助团队完成归因和复盘'],
]

const newcomerFacts = [
  '移山科技是一家技术与运营双轮驱动的全链路 GEO 优化服务商。',
  '我们的目标不是多发内容，而是让品牌被 AI 准确理解、持续引用和优先推荐。',
  '项目按“诊断、方案、实施、监测、归因、迭代”形成闭环。',
  '核心结果指标是可见度占比、TOP1 / TOP3 占比和 AI 引用率。',
  '所有优化基于品牌事实、可信信源和可验证过程，坚持白帽与长期主义。',
]

const faqs = [
  {
    question: '移山科技到底是做什么的？',
    answer: '我们帮助品牌改善在 DeepSeek、豆包、Kimi、通义千问、腾讯元宝等 AI 平台中的呈现，让品牌更容易被准确理解、引用和推荐。服务覆盖诊断、知识库、知识图谱、多平台适配、监测、归因与持续迭代。',
  },
  {
    question: 'GEO 和传统 SEO 有什么不同？',
    answer: '传统 SEO 更关注关键词、网页和搜索排名；GEO 关注 AI 回答中的品牌理解、引用和推荐。它不是把 SEO 原样搬进 AI，而是围绕知识结构、可信信源、平台适配和效果归因重新组织品牌资产。',
  },
  {
    question: '客户已经做内容营销，为什么还需要 GEO？',
    answer: '内容营销解决“有没有内容、有没有传播”，GEO 进一步解决“这些内容能不能被 AI 理解、调用和推荐”。我们会把分散内容重构为口径统一、结构清晰、可持续复用的品牌知识资产。',
  },
  {
    question: '我们怎样判断项目有没有效果？',
    answer: '主要观察可见度占比、TOP1 / TOP3 占比和 AI 引用率，并通过归因分析判断哪些内容、信源和平台动作推动了结果变化。',
  },
  {
    question: '为什么不承诺固定排名或立即收录？',
    answer: 'AI 平台、品牌基础、内容资产和竞争环境都在变化。专业交付应该给出可追踪的过程、指标和归因，而不是用不可控的固定结果承诺替代长期建设。',
  },
]

function CompanyPage() {
  const [activeStep, setActiveStep] = useState(0)
  const [systemsOpen, setSystemsOpen] = useState(false)
  const [openFaq, setOpenFaq] = useState(0)
  const currentStep = deliverySteps[activeStep]
  const StepIcon = currentStep.icon

  return (
    <div className="site-shell company-page-shell">
      <header className="topbar company-topbar">
        <a className="brand" href="/" aria-label="返回 Orosaga 山海经首页">
          <img src="/favicon.svg" alt="" />
          <span className="brand-copy"><strong>Orosaga</strong><small>山海经</small></span>
        </a>
        <span className="company-page-location">公司与业务</span>
        <a className="company-back" href="/">
          <ArrowLeft size={16} /> 返回知识地图
        </a>
      </header>

      <main className="company-page">
        <div className="company-layout section-wrap">
          <aside className="company-sidebar" aria-label="公司与业务目录">
            <div className="company-sidebar-title">
              <span>Newcomer guide</span>
              <strong>新人阅读路线</strong>
            </div>
            <nav>
              <a href="#overview"><span>01</span>公司是什么</a>
              <a href="#why-geo"><span>02</span>为什么做 GEO</a>
              <a href="#solution"><span>03</span>我们怎样解决</a>
              <a href="#delivery"><span>04</span>业务如何运转</a>
              <a href="#customers"><span>05</span>服务谁</a>
              <a href="#proof"><span>06</span>结果与边界</a>
              <a href="#remember"><span>07</span>新人必记</a>
            </nav>
            <div className="company-source-note">
              <BookOpenCheck size={15} />
              <span>内容依据<br /><strong>移山科技 AI 知识库 V3.0</strong><br />2026.06.23</span>
            </div>
          </aside>

          <article className="company-article">
            <section className="company-intro" id="overview">
              <span className="eyebrow">Company & business · 公司与业务</span>
              <h1>先把移山科技说清楚</h1>
              <p className="company-lead">这不是一份公司宣传册，而是一条新人理解业务的最短路径。先知道我们解决什么问题，再理解系统、运营和结果如何连在一起。</p>

              <div className="company-definition">
                <div className="company-definition-mark">
                  <img src="/favicon.svg" alt="移山科技山海标识" />
                  <span>30 秒版本</span>
                </div>
                <div>
                  <strong>移山科技是一家技术与运营双轮驱动的全链路 GEO 优化服务商。</strong>
                  <p>我们帮助品牌把分散的信息建设成 AI 能理解、能引用、能推荐的长期知识资产。</p>
                </div>
              </div>

              <dl className="company-facts">
                <div><dt>成立</dt><dd>2020 年 8 月 5 日</dd></div>
                <div><dt>所在</dt><dd>北京总部 · 西安分公司</dd></div>
                <div><dt>服务对象</dt><dd>重视长期品牌资产与可归因增长的企业</dd></div>
                <div><dt>核心主张</dt><dd>让 AI 为您发声，让世界看见价值</dd></div>
              </dl>
            </section>

            <section className="company-section" id="why-geo">
              <div className="company-section-heading">
                <span>01 · Why GEO</span>
                <h2>为什么会出现 GEO 这门业务？</h2>
                <p>因为用户获取答案的方式变了，品牌竞争的位置也随之改变。</p>
              </div>

              <div className="behavior-shift" aria-label="用户获取信息方式变化">
                <div>
                  <span>过去</span>
                  <SearchCheck size={22} />
                  <strong>搜索关键词</strong>
                  <p>打开多个网页，自己比较和判断。</p>
                </div>
                <ArrowRight size={20} />
                <div>
                  <span>现在</span>
                  <BrainCircuit size={22} />
                  <strong>直接询问 AI</strong>
                  <p>让 AI 总结方案，并给出品牌建议。</p>
                </div>
                <ArrowRight size={20} />
                <div className="behavior-question">
                  <span>品牌的新问题</span>
                  <Target size={22} />
                  <strong>AI 会不会提到我？</strong>
                  <p>是否看见、理解、引用，并把品牌作为推荐对象。</p>
                </div>
              </div>

              <div className="geo-definition">
                <span>GEO 的核心</span>
                <p>不是“给 AI 写更多文章”，而是主动建设一套可被 AI 理解、引用和推荐的品牌知识资产，并持续验证它是否真正改变了 AI 回答。</p>
              </div>
            </section>

            <section className="company-section" id="solution">
              <div className="company-section-heading">
                <span>02 · Our solution</span>
                <h2>我们怎样把一个模糊问题变成可交付的服务</h2>
                <p>方法很朴素：先发现问题，再建设资产，最后用数据持续优化。</p>
              </div>

              <div className="solution-layers">
                <div>
                  <span>01</span>
                  <FileSearch size={21} />
                  <h3>发现问题</h3>
                  <p>诊断品牌在 AI 搜索中的可见度、推荐、信源和表达差距。</p>
                </div>
                <div>
                  <span>02</span>
                  <Network size={21} />
                  <h3>建设资产</h3>
                  <p>把官网、内容、案例等分散资料重构为统一的知识库和知识图谱。</p>
                </div>
                <div>
                  <span>03</span>
                  <BarChart3 size={21} />
                  <h3>持续优化</h3>
                  <p>适配多平台，监测回答变化，完成归因并把有效经验带回下一轮。</p>
                </div>
              </div>

              <div className="two-wheel-system">
                <div>
                  <span className="wheel-icon"><Bot size={22} /></span>
                  <div><small>技术轮</small><strong>7 大数字化系统 + 20+ 优化 Agent</strong><p>负责监测、采集、创作、信源分析、质量评估、策略生成和回答解析。</p></div>
                </div>
                <div>
                  <span className="wheel-icon operations"><Users size={22} /></span>
                  <div><small>运营轮</small><strong>标准化交付 + 多对一精细运营</strong><p>负责理解客户业务、制定策略、把控事实、推动落地并持续复盘。</p></div>
                </div>
              </div>

              <button className="systems-disclosure" type="button" aria-expanded={systemsOpen} onClick={() => setSystemsOpen((current) => !current)}>
                <span><Sparkles size={16} /> 7 大 GEO 数字化系统分别做什么？</span>
                <ChevronDown size={18} />
              </button>
              {systemsOpen && (
                <div className="systems-list">
                  {systemCapabilities.map(([name, description], index) => (
                    <div key={name}><span>{String(index + 1).padStart(2, '0')}</span><strong>{name}</strong><p>{description}</p></div>
                  ))}
                </div>
              )}
            </section>

            <section className="company-section" id="delivery">
              <div className="company-section-heading">
                <span>03 · Delivery</span>
                <h2>一项业务怎样从问题走到结果</h2>
                <p>六个阶段不是线性交差，而是一个会反复校准的闭环。</p>
              </div>

              <div className="delivery-tabs" role="tablist" aria-label="GEO 标准交付路径">
                {deliverySteps.map((step, index) => {
                  const Icon = step.icon
                  return (
                    <button type="button" role="tab" aria-selected={activeStep === index} onClick={() => setActiveStep(index)} className={activeStep === index ? 'is-active' : ''} key={step.title}>
                      <span>{String(index + 1).padStart(2, '0')}</span>
                      <Icon size={17} />
                      <strong>{step.title}</strong>
                    </button>
                  )
                })}
              </div>
              <div className="delivery-detail" role="tabpanel" key={currentStep.title}>
                <span className="delivery-detail-icon"><StepIcon size={25} /></span>
                <div><small>{currentStep.subtitle}</small><h3>{currentStep.title}</h3><p>{currentStep.description}</p></div>
                <div className="delivery-output"><span>这一阶段留下什么</span><strong>{currentStep.output}</strong></div>
              </div>

              <div className="metric-language">
                <span>我们用三类结果说话</span>
                <div><strong>可见度占比</strong><p>品牌有没有进入 AI 回答</p></div>
                <div><strong>TOP1 / TOP3</strong><p>品牌在推荐位置上是否靠前</p></div>
                <div><strong>AI 引用率</strong><p>品牌内容是否被 AI 作为依据</p></div>
              </div>
            </section>

            <section className="company-section" id="customers">
              <div className="company-section-heading">
                <span>04 · Customers & service</span>
                <h2>谁会来找我们，他们真正需要什么</h2>
                <p>我们更适合已经有品牌基础、业务复杂，并且重视长期效果的企业。</p>
              </div>

              <div className="customer-fit">
                <div><Building2 size={19} /><strong>已有品牌基础</strong><p>有官网、内容中心、媒体报道或行业资料，但信息分散。</p></div>
                <div><Globe2 size={19} /><strong>业务解释成本高</strong><p>产品复杂、决策链路长，需要被 AI 准确介绍和比较。</p></div>
                <div><Gauge size={19} /><strong>重视可归因增长</strong><p>希望知道投入带来了什么变化，而不是只统计发文量。</p></div>
                <div><ShieldCheck size={19} /><strong>看重可信与合规</strong><p>要求表达准确、过程可验证，不接受短期灰黑产打法。</p></div>
              </div>

              <div className="service-modes">
                <div>
                  <span>阶段验证</span>
                  <h3>GEO 1.0 · 季度合作</h3>
                  <strong>30–90 天</strong>
                  <p>聚焦关键平台与问题场景，完成诊断、实施、监测和归因，用阶段结果验证 GEO 的价值。</p>
                </div>
                <div>
                  <span>长期建设</span>
                  <h3>GEO 全流程 · 年度合作</h3>
                  <strong>12 个月+</strong>
                  <p>持续建设知识库、知识图谱和多平台认知资产，通过周报、月报和季度复盘长期迭代。</p>
                </div>
              </div>

              <div className="raas-note">
                <CircleDot size={17} />
                <p><strong>RaaS：Result as a Service</strong>把合作重心从“做了多少内容”转向“带来了多少可见变化”，围绕可追踪结果推进合作。</p>
              </div>
            </section>

            <section className="company-section" id="proof">
              <div className="company-section-heading">
                <span>05 · Proof & boundary</span>
                <h2>我们如何证明价值，也如何守住边界</h2>
                <p>案例说明能力，边界保证可信。两者缺一不可。</p>
              </div>

              <div className="proof-stats">
                <div><span>平均 AI 推荐率提升</span><strong>300%+</strong></div>
                <div><span>交付成功率</span><strong>99%</strong></div>
                <div><span>平均可见度相对提升</span><strong>85%+</strong></div>
                <div><span>典型案例 TOP 排名平均提升</span><strong>约 320%</strong></div>
              </div>

              <div className="case-studies">
                <article><span>线下教育 · 27 天</span><strong>0.14% → 75.74%</strong><p>AI 可见度从几乎不可见，到进入主流推荐范围。</p></article>
                <article><span>在线教育 · 21 天</span><strong>7.6% → 44.5%</strong><p>TOP1 占比提升，同时总体推荐率增长 450%。</p></article>
                <article><span>母婴童车 · 2 个月</span><strong>53% → 84.7%</strong><p>项目总体可见度提升，推荐度与 TOP3 占比同步改善。</p></article>
              </div>
              <p className="proof-disclaimer">以上为知识库收录的匿名案例与历史数据，用于解释业务能力，不构成固定结果承诺。实际效果受品牌基础、平台状态、内容资产和执行周期影响。</p>

              <div className="boundary-grid">
                <div>
                  <span><Check size={17} />我们坚持</span>
                  <p>基于品牌事实、公开内容、结构化表达、可信信源、数据监测和可验证过程推进。</p>
                </div>
                <div>
                  <span><ShieldCheck size={17} />我们不做</span>
                  <p>不做 GEO 投毒，不使用虚假信息，不恶意踩踏竞品，不用批量低质内容换短期曝光。</p>
                </div>
              </div>

              <div className="company-milestones">
                <span>行业建设</span>
                <div><strong>2020</strong><p>北京移山科技有限公司成立。</p></div>
                <div><strong>2025</strong><p>发布早期 GEO 行业白皮书，并参与行业早期运营执行标准建设。</p></div>
                <div><strong>2026</strong><p>在北京发起“中国首届 GEO 大会”，并参与发起行业自律公约。</p></div>
              </div>
            </section>

            <section className="company-section company-remember" id="remember">
              <div className="company-section-heading">
                <span>06 · Newcomer checklist</span>
                <h2>新人离开这一页前，至少记住五句话</h2>
              </div>
              <ol>
                {newcomerFacts.map((fact, index) => <li key={fact}><span>{String(index + 1).padStart(2, '0')}</span><p>{fact}</p></li>)}
              </ol>
            </section>

            <section className="company-section company-faq" aria-labelledby="company-faq-title">
              <div className="company-section-heading">
                <span>Quick answers</span>
                <h2 id="company-faq-title">最常被问到的五个问题</h2>
              </div>
              <div className="company-faq-list">
                {faqs.map((faq, index) => (
                  <div className={openFaq === index ? 'is-open' : ''} key={faq.question}>
                    <button type="button" aria-expanded={openFaq === index} onClick={() => setOpenFaq(openFaq === index ? -1 : index)}>
                      <span>{String(index + 1).padStart(2, '0')}</span><strong>{faq.question}</strong><ChevronDown size={18} />
                    </button>
                    {openFaq === index && <p>{faq.answer}</p>}
                  </div>
                ))}
              </div>
            </section>
          </article>
        </div>
      </main>

      <footer className="company-page-footer">
        <a className="brand footer-brand" href="/">
          <img src="/favicon.svg" alt="" />
          <span className="brand-copy"><strong>Orosaga</strong><small>山海经</small></span>
        </a>
        <p>公司与业务 · 新人阅读手册</p>
        <span>© 2026 Yishan Technology</span>
      </footer>
    </div>
  )
}

export default CompanyPage
