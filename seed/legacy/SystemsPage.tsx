import {
  ArrowLeft,
  ArrowUpRight,
  BookOpenText,
  Boxes,
  ChartNoAxesCombined,
  ClipboardCheck,
  Database,
  FileText,
  Radar,
  Workflow,
} from 'lucide-react'

type SystemEntry = {
  name: string
  description: string
  href: string
  label: string
  icon: typeof Database
}

type SystemGroup = {
  number: string
  title: string
  description: string
  systems: SystemEntry[]
}

const systemGroups: SystemGroup[] = [
  {
    number: '01',
    title: '项目启动与数据沉淀',
    description: '先把可用的数据、问句与好内容放到该放的位置，后面的判断才有依据。',
    systems: [
      {
        name: 'GEO 系统后台',
        description: '数据采集与项目列表。用于建立项目、查看采集任务，并确认基础数据已经到位。',
        href: 'https://wanhuchangan.com/geo-enterprise/list',
        label: '数据采集',
        icon: Database,
      },
      {
        name: '好文章好信源',
        description: '沉淀可参考的高质量文章与信源，帮助内容判断有可追溯的参考坐标。',
        href: 'https://good.wanhuchangan.cn/',
        label: '内容资产',
        icon: BookOpenText,
      },
    ],
  },
  {
    number: '02',
    title: '运营执行与协同',
    description: '把日常动作、任务推进和提交节点集中到能被团队看见的工作台。',
    systems: [
      {
        name: 'Noah 辅助工作台',
        description: '在日常运营中辅助处理任务与素材，适合承接具体执行动作。',
        href: 'https://noah.wanhuchangan.com/desktop',
        label: '辅助执行',
        icon: Workflow,
      },
      {
        name: 'YiShanOS 运营工作台',
        description: '运营提交入口。用于按标准流程推进任务，并保留过程记录。',
        href: 'http://localhost:3302/prototype/submission',
        label: '运营提交',
        icon: ClipboardCheck,
      },
    ],
  },
  {
    number: '03',
    title: '观察、分析与交付',
    description: '从数据变化里找到下一步，再把阶段性结果整理成可以被客户和团队理解的交付。',
    systems: [
      {
        name: '数据分析面板',
        description: '查看项目数据、趋势与关键变化，为复盘和下一轮策略提供依据。',
        href: 'https://dash.wanhuchangan.cn/',
        label: '数据分析',
        icon: ChartNoAxesCombined,
      },
      {
        name: 'SaaS 看板',
        description: '从客户运营视角查看服务状态与项目概况，便于持续跟进。',
        href: 'https://status.geokeji.com/operator/clients',
        label: '客户看板',
        icon: Radar,
      },
      {
        name: '报告生成系统',
        description: '把阶段数据整理为标准化报告，减少重复排版并保持对外口径一致。',
        href: 'http://47.95.247.158:8765/',
        label: '报告交付',
        icon: FileText,
      },
    ],
  },
]

function SystemsPage() {
  return (
    <div className="site-shell systems-page-shell">
      <header className="topbar systems-topbar">
        <a className="brand" href="/" aria-label="返回 Orosaga 山海经首页">
          <img src="/favicon.svg" alt="" />
          <span className="brand-copy"><strong>Orosaga</strong><small>山海经</small></span>
        </a>
        <span className="systems-page-location">系统地图 · 工作台入口</span>
        <a className="systems-back" href="/"><ArrowLeft size={16} /> 返回知识地图</a>
      </header>

      <main className="systems-page">
        <section className="systems-hero" aria-labelledby="systems-title">
          <div className="section-wrap systems-hero-inner">
            <div>
              <span className="eyebrow"><Boxes size={14} /> System map · 系统地图</span>
              <h1 id="systems-title">先知道在哪做，<br />再开始把事做好</h1>
              <p>七个工作台按实际工作场景放在一起。先选你现在所处的阶段，再进入对应系统完成下一步。</p>
            </div>
            <dl className="systems-hero-stats" aria-label="系统地图概览">
              <div><dt>系统入口</dt><dd>7</dd></div>
              <div><dt>工作场景</dt><dd>3</dd></div>
              <div><dt>使用方式</dt><dd>按任务进入</dd></div>
            </dl>
          </div>
        </section>

        <section className="systems-directory section-wrap" aria-label="按工作场景查看系统">
          <div className="systems-directory-intro">
            <span>工作路径</span>
            <p>不是每个系统都需要每天打开。根据你正要完成的工作，进入对应入口即可。</p>
          </div>

          {systemGroups.map((group) => (
            <section className="systems-group" aria-labelledby={`systems-group-${group.number}`} key={group.number}>
              <header className="systems-group-heading">
                <span>{group.number}</span>
                <div>
                  <h2 id={`systems-group-${group.number}`}>{group.title}</h2>
                  <p>{group.description}</p>
                </div>
              </header>
              <div className="systems-list-grid">
                {group.systems.map((system) => {
                  const Icon = system.icon
                  return (
                    <a className="system-entry" href={system.href} target="_blank" rel="noopener noreferrer" key={system.name}>
                      <span className="system-entry-icon"><Icon size={20} strokeWidth={1.75} /></span>
                      <div className="system-entry-copy">
                        <span>{system.label}</span>
                        <strong>{system.name}</strong>
                        <p>{system.description}</p>
                      </div>
                      <span className="system-entry-action" aria-hidden="true"><ArrowUpRight size={17} /></span>
                    </a>
                  )
                })}
              </div>
            </section>
          ))}
        </section>
      </main>

      <footer className="systems-page-footer">
        <a className="brand footer-brand" href="/"><img src="/favicon.svg" alt="" /><span className="brand-copy"><strong>Orosaga</strong><small>山海经</small></span></a>
        <p>系统地图 · 按场景持续校准</p>
        <span>© 2026 Yishan Technology</span>
      </footer>
    </div>
  )
}

export default SystemsPage
