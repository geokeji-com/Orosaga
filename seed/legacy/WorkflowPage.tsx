import { useState } from 'react'
import {
  ArrowLeft,
  ArrowUpRight,
  Boxes,
  Building2,
  ChartNoAxesCombined,
  CheckCircle2,
  ChevronRight,
  ClipboardCheck,
  Database,
  PenTool,
  Radar,
  Send,
  ShieldCheck,
  Users,
} from 'lucide-react'

type WorkflowStage = {
  id: string
  number: string
  shortTitle: string
  title: string
  summary: string
  owner: string
  system: string
  icon: typeof Building2
  inputs: string[]
  actions: string[]
  done: string[]
  outputs: string[]
  next: string
}

const workflowStages: WorkflowStage[] = [
  {
    id: 'intake',
    number: '01',
    shortTitle: '项目接入',
    title: '客户接入与项目建档',
    summary: '把销售阶段的信息转成运营可以直接接手的项目上下文。',
    owner: '销售 → 运营',
    system: 'Clients & Projects',
    icon: ClipboardCheck,
    inputs: ['客户与行业信息', '核心关键词与服务范围', '合同预算与交付节奏'],
    actions: ['拓展 10–20 个服务问句', '拉群并发起资料收集', '建立项目档案并分配负责人'],
    done: ['关键词与问句已经入库', '资料目录可访问且缺口已标记', '项目成员和首个里程碑已确认'],
    outputs: ['项目档案', '问句清单', '资料收集清单'],
    next: '进入知识库构建',
  },
  {
    id: 'knowledge',
    number: '02',
    shortTitle: '知识库构建',
    title: '构建 QMap 与 Card Pack',
    summary: '让品牌事实、竞品信息和写作背景各归其位，成为后续生产的可靠底座。',
    owner: '项目运营',
    system: 'Knowledge Studio',
    icon: Database,
    inputs: ['客户原始资料', '品牌与产品事实', '竞品及行业背景'],
    actions: ['生成 QMap 与卡片骨架', '清洗素材并预览归位方案', '确认写入并追踪空字段'],
    done: ['Query 与目标实体映射正确', '归位方案经人工确认后写入', '空字段已形成客户补充清单'],
    outputs: ['QMap', 'Card Pack', 'Fill Plan'],
    next: '启动内容生产',
  },
  {
    id: 'content',
    number: '03',
    shortTitle: '内容生产',
    title: '从知识资产生成可投母稿',
    summary: '选择 Card Pack 生成或高引用仿写策略，把 Query 转为可审核、可追溯的文章。',
    owner: '项目运营 + AI Skill',
    system: 'Content Studio',
    icon: PenTool,
    inputs: ['已确认的 QMap', '完整 Card Pack', '文章策略与目标 Query'],
    actions: ['确认 Query、文章类型和竞品', '批量执行生成或仿写', '预览、编辑并检查 Production Log'],
    done: ['Query 已在 QMap 中精确匹配', '事实与竞品引用可追溯', '母稿审核后标记为待投放'],
    outputs: ['Markdown 母稿', 'Production Log', '待投放候选'],
    next: '制定投放计划',
  },
  {
    id: 'publishing',
    number: '04',
    shortTitle: '投放发布',
    title: '从母稿到媒体回链',
    summary: '结合平台召回特性和预算，把文章送到更有机会被 AI 召回的信源。',
    owner: '项目运营',
    system: 'Channels & Publishing',
    icon: Send,
    inputs: ['待投母稿', '媒体资源与召回特性', '项目预算余量'],
    actions: ['生成文章 × 媒体投放建议', '预览成本并确认投放计划', '即时或定时发布并同步状态'],
    done: ['预算约束校验通过', '花钱动作完成二次确认', '发布账本与媒体回链已生成'],
    outputs: ['投放计划', '发布账本', 'Receipt URL'],
    next: '发起引用追踪',
  },
  {
    id: 'citation',
    number: '05',
    shortTitle: '引用追踪',
    title: '确认内容是否进入 AI 回答',
    summary: '用发布回链作为匹配锚点，持续观察各平台对文章和问句的真实引用表现。',
    owner: '项目运营',
    system: 'Citation & Analytics',
    icon: Radar,
    inputs: ['已发布文章回链', 'POI 项目 URL 库', '采集批次与检测阈值'],
    actions: ['同步回链到 POI 项目', '创建引用检测并读取结果', '按平台与时间窗汇总表现'],
    done: ['引用与未引用条目均可定位', '最近一次 / 7 天 / 30 天口径一致', '异常回链和匹配结果已复核'],
    outputs: ['引用检测记录', '平台分布', '待优化清单'],
    next: '进入策略复盘',
  },
  {
    id: 'iteration',
    number: '06',
    shortTitle: '策略迭代',
    title: '把结果沉淀为下一轮优势',
    summary: '分析未引用原因、保留高引用样本，让每轮数据都能改进知识库、内容和投放策略。',
    owner: '项目运营 + 负责人',
    system: 'Analytics + Knowledge Base',
    icon: ChartNoAxesCombined,
    inputs: ['引用数据与平台差异', '未引用问句和文章', '项目过程反馈'],
    actions: ['定位内容、信源或预算问题', '制定下一轮优化动作', '回流高引用文章与有效经验'],
    done: ['问题已转成明确责任与动作', '高引用文章进入好文章库', 'SOP、Card Pack 或召回特性已更新'],
    outputs: ['数据复盘', '优化任务', '高引用资产'],
    next: '回到新一轮生产',
  },
]

function WorkflowPage() {
  const [activeWorkflow, setActiveWorkflow] = useState(workflowStages[0].id)
  const currentWorkflow = workflowStages.find((stage) => stage.id === activeWorkflow) ?? workflowStages[0]

  return (
    <div className="site-shell workflow-page-shell">
      <header className="topbar workflow-topbar">
        <a className="brand" href="/" aria-label="返回 Orosaga 山海经首页">
          <img src="/favicon.svg" alt="" />
          <span className="brand-copy"><strong>Orosaga</strong><small>山海经</small></span>
        </a>
        <span className="workflow-page-location">运营工作流</span>
        <a className="workflow-back" href="/">
          <ArrowLeft size={16} /> 返回知识地图
        </a>
      </header>

      <main className="workflow-page">
        <section className="workflow-page-hero" aria-labelledby="workflow-page-title">
          <div className="section-wrap workflow-page-hero-inner">
            <div>
              <span className="eyebrow">Operating workflow · 运营工作流</span>
              <h1 id="workflow-page-title">把一次项目，完整地走一遍</h1>
              <p>从客户接入到策略迭代，六段流程把输入、动作、完成标准和交接产物连成一个闭环。</p>
            </div>
            <div className="workflow-page-note">
              <ShieldCheck size={19} />
              <p><strong>共同约定</strong>关键节点由人确认，过程由系统追溯。</p>
            </div>
          </div>
        </section>

        <section className="workflow-page-content section-wrap" aria-label="运营工作流详情">
          <div className="workflow-summary" aria-label="工作流概览">
            <div><strong>6</strong><span>条标准流程</span></div>
            <div><strong>18</strong><span>项完成标准</span></div>
            <div><strong>1</strong><span>个数据闭环</span></div>
            <div className="workflow-principle"><ShieldCheck size={18} /><span>选择当前阶段，先确认做到什么才算完成</span></div>
          </div>

          <div className="workflow-stage-nav" role="tablist" aria-label="选择运营阶段">
            {workflowStages.map((stage) => {
              const Icon = stage.icon
              const isActive = stage.id === currentWorkflow.id
              return (
                <button
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls="workflow-panel"
                  className={isActive ? 'workflow-stage is-active' : 'workflow-stage'}
                  onClick={() => setActiveWorkflow(stage.id)}
                  key={stage.id}
                >
                  <span className="stage-index">{stage.number}</span>
                  <span className="stage-icon"><Icon size={17} strokeWidth={1.8} /></span>
                  <strong>{stage.shortTitle}</strong>
                  <ChevronRight size={15} className="stage-chevron" />
                </button>
              )
            })}
          </div>

          <div className="workflow-panel" id="workflow-panel" role="tabpanel" key={currentWorkflow.id}>
            <div className="workflow-panel-main">
              <div className="workflow-panel-title">
                <span>{currentWorkflow.number} / 06</span>
                <h2>{currentWorkflow.title}</h2>
                <p>{currentWorkflow.summary}</p>
              </div>
              <dl className="workflow-meta">
                <div><dt>主责角色</dt><dd><Users size={15} />{currentWorkflow.owner}</dd></div>
                <div><dt>工作系统</dt><dd><Boxes size={15} />{currentWorkflow.system}</dd></div>
              </dl>
              <div className="workflow-output">
                <span>关键产物</span>
                <div>{currentWorkflow.outputs.map((output) => <b key={output}>{output}</b>)}</div>
              </div>
              <div className="workflow-handoff">
                <span>完成后</span>
                <strong>{currentWorkflow.next}</strong>
                <ArrowUpRight size={17} />
              </div>
            </div>

            <div className="workflow-checkpoints">
              <div className="workflow-checkpoint">
                <span className="checkpoint-label">开始前确认</span>
                <ul>{currentWorkflow.inputs.map((item) => <li key={item}><span />{item}</li>)}</ul>
              </div>
              <div className="workflow-checkpoint action-list">
                <span className="checkpoint-label">本阶段动作</span>
                <ol>{currentWorkflow.actions.map((item, index) => <li key={item}><span>{index + 1}</span>{item}</li>)}</ol>
              </div>
              <div className="workflow-checkpoint done-list">
                <span className="checkpoint-label"><CheckCircle2 size={15} />完成标准</span>
                <ul>{currentWorkflow.done.map((item) => <li key={item}><CheckCircle2 size={16} />{item}</li>)}</ul>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="workflow-page-footer">
        <a className="brand footer-brand" href="/">
          <img src="/favicon.svg" alt="" />
          <span className="brand-copy"><strong>Orosaga</strong><small>山海经</small></span>
        </a>
        <p>运营工作流 · 持续校准中</p>
        <span>© 2026 Yishan Technology</span>
      </footer>
    </div>
  )
}

export default WorkflowPage
