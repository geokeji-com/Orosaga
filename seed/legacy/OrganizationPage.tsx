import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  ArrowUpRight,
  BriefcaseBusiness,
  ChevronRight,
  CircleUserRound,
  Mail,
  MapPin,
  Network,
  Search,
  Sparkles,
  Users,
  X,
} from 'lucide-react'

type Member = {
  id: string
  name: string
  department: string
  role: string
  initials: string
  photo?: string
  isHead?: boolean
  bio: string
  learn: string
  tags: string[]
}

type Department = {
  id: string
  title: string
  short: string
  description: string
  color: string
  members: Member[]
}

const member = (data: Omit<Member, 'department'> & { department: string }): Member => data

const executiveMembers: Member[] = [
  member({
    id: 'fang-zhiwu', name: '房志武', department: '总裁办', role: '创始人 / 总裁', initials: '志武', photo: '/team/房志武.png', isHead: true,
    bio: '负责公司方向、长期战略和关键业务判断，推动移山科技在 AI 搜索时代建立可持续的服务能力。',
    learn: '公司为什么做 GEO、长期业务方向与重要决策背景。', tags: ['公司方向', '业务战略', 'GEO 行业'],
  }),
  member({
    id: 'du-guangming', name: '杜光明', department: '总裁办', role: '总裁办成员', initials: '明光', photo: '/team/杜光明.png',
    bio: '参与公司经营协同与重点事项推进，连接不同团队，让重要事情在组织里顺畅发生。',
    learn: '跨部门协同、重点事项推进与公司经营节奏。', tags: ['经营协同', '重点事项', '组织连接'],
  }),
]

const departments: Department[] = [
  {
    id: 'sales', title: '销售部', short: 'Sales', description: '连接客户需求与公司解决方案', color: 'blue',
    members: [
      member({ id: 'tang-xiaoxin', name: '唐小新', department: '销售部', role: '销售部负责人', initials: '小新', photo: '/team/唐小新.png', isHead: true, bio: '负责销售团队与客户前期沟通，把客户的业务问题带回公司并找到合适的服务路径。', learn: '客户需求、合作范围、项目接入和前期业务判断。', tags: ['客户接入', '需求判断', '合作沟通'] }),
      member({ id: 'wen-ting', name: '文婷', department: '销售部', role: '销售协作', initials: '文婷', photo: '/team/文婷.png', bio: '参与客户沟通与销售协作，帮助需求信息准确进入后续交付环节。', learn: '客户沟通、需求记录与销售协作。', tags: ['客户沟通', '销售协作'] }),
      member({ id: 'liu-ziyu', name: '刘子瑜', department: '销售部', role: '销售协作', initials: '子瑜', photo: '/team/刘子瑜.png', bio: '参与客户关系维护与业务信息整理，支持销售团队推进机会。', learn: '客户关系与业务信息整理。', tags: ['客户关系', '业务整理'] }),
      member({ id: 'wang-anlei', name: '王安磊', department: '销售部', role: '销售协作', initials: '安磊', photo: '/team/王安磊.png', bio: '参与销售过程中的客户连接与信息协同，推动沟通继续向前。', learn: '销售流程、客户连接与团队协同。', tags: ['销售流程', '团队协同'] }),
    ],
  },
  {
    id: 'operations', title: '运营部', short: 'Operations', description: '把客户目标变成可交付的结果', color: 'green',
    members: [
      member({ id: 'yao-jingang', name: '姚金刚', department: '运营部', role: '运营部负责人', initials: '金刚', photo: '/team/姚金刚.png', isHead: true, bio: '负责运营交付、项目质量与团队协同，让策略、内容、投放和复盘形成完整闭环。', learn: 'GEO 交付路径、项目判断与运营协作。', tags: ['项目交付', '运营管理', '结果复盘'] }),
      member({ id: 'cheng-shinan', name: '程诗楠', department: '运营部', role: '项目运营', initials: '诗楠', photo: '/team/程诗楠.png', bio: '参与客户项目的日常运营与交付协作，推动事项按节奏完成。', learn: '项目节奏、客户协作与交付跟进。', tags: ['项目运营', '交付跟进'] }),
      member({ id: 'dou-ruijian', name: '窦荣健', department: '运营部', role: '项目运营', initials: '荣健', photo: '/team/窦荣健.png', bio: '参与项目运营与内容执行，协助把客户目标拆成可执行动作。', learn: '项目动作拆解与内容执行。', tags: ['动作拆解', '内容执行'] }),
      member({ id: 'guo-xiaobin', name: '郭潇斌', department: '运营部', role: '项目运营', initials: '潇斌', photo: '/team/郭潇斌.png', bio: '参与项目推进与过程协作，帮助交付信息保持清晰、连续。', learn: '项目推进与过程协作。', tags: ['项目推进', '过程协作'] }),
      member({ id: 'he-limeng', name: '贺李蒙', department: '运营部', role: '项目运营', initials: '李蒙', photo: '/team/贺李蒙.png', bio: '参与客户项目执行与资料整理，让业务信息可以被团队持续使用。', learn: '资料整理、项目执行与知识沉淀。', tags: ['资料整理', '知识沉淀'] }),
      member({ id: 'hu-jiajia', name: '胡佳伟', department: '运营部', role: '项目运营', initials: '佳伟', photo: '/team/胡佳伟.png', bio: '参与项目运营和跨环节协作，支持客户目标向结果推进。', learn: '运营协作与交付推进。', tags: ['运营协作', '交付推进'] }),
      member({ id: 'ni-zhoubo', name: '倪洲博', department: '运营部', role: '项目运营', initials: '洲博', photo: '/team/倪洲博.png', bio: '参与运营项目的日常执行与反馈整理，协助团队不断校准策略。', learn: '反馈整理、策略校准与项目执行。', tags: ['反馈整理', '策略校准'] }),
      member({ id: 'li-jing', name: '李菁', department: '运营部', role: '项目运营', initials: '李菁', photo: '/team/李菁.png', bio: '参与客户项目与内容协作，帮助团队保持稳定的交付节奏。', learn: '内容协作与交付节奏。', tags: ['内容协作', '交付节奏'] }),
      member({ id: 'shi-yuqian', name: '史郁倩', department: '运营部', role: '项目运营', initials: '郁倩', photo: '/team/史郁倩.png', bio: '参与运营执行与项目资料协同，为客户交付提供稳定支持。', learn: '运营执行与项目资料协同。', tags: ['运营执行', '资料协同'] }),
      member({ id: 'song-ruoxuan', name: '宋若宣', department: '运营部', role: '项目运营', initials: '若宣', photo: '/team/宋若宣.png', bio: '参与客户项目的运营动作和团队协作，支持项目顺利推进。', learn: '项目动作与团队协作。', tags: ['项目动作', '团队协作'] }),
      member({ id: 'sun-yiping', name: '孙怡萍', department: '运营部', role: '项目运营', initials: '怡萍', photo: '/team/孙怡萍.png', bio: '参与运营交付与过程整理，让每一次项目经验都更容易复用。', learn: '过程整理与经验复用。', tags: ['过程整理', '经验复用'] }),
      member({ id: 'yan-qian', name: '严茜', department: '运营部', role: '项目运营', initials: '严茜', photo: '/team/严茜.png', bio: '参与客户项目运营与交付协作，推动细节被准确记录和执行。', learn: '项目细节、运营执行与交付协作。', tags: ['运营执行', '交付协作'] }),
      member({ id: 'zhang-jiao', name: '张娇', department: '运营部', role: '项目运营', initials: '张娇', photo: '/team/张娇.png', bio: '参与运营项目与内容协同，支持团队把客户问题转化为明确动作。', learn: '客户问题拆解与内容协同。', tags: ['问题拆解', '内容协同'] }),
    ],
  },
  {
    id: 'technology', title: '技术部', short: 'Technology', description: '把方法沉淀成系统与工具', color: 'violet',
    members: [
      member({ id: 'luo-wei', name: '罗威', department: '技术部', role: '技术部负责人', initials: '罗威', photo: '/team/罗威.png', isHead: true, bio: '负责技术方向、系统建设与研发协作，把 GEO 方法沉淀成可靠的产品能力。', learn: '系统能力、技术方案与产品研发协作。', tags: ['技术方向', '系统建设', '研发协作'] }),
      member({ id: 'li-zechen', name: '李泽辰 Asuka', department: '技术部', role: '技术研发', initials: '泽辰', photo: '/team/李泽辰.png', bio: '参与产品研发与技术实现，把业务需求转化为稳定、易用的系统能力。', learn: '产品研发、技术实现与系统协作。', tags: ['产品研发', '技术实现'] }),
      member({ id: 'liu-chenglu', name: '刘程路', department: '技术部', role: '技术研发', initials: '程路', photo: '/team/刘程路.png', bio: '参与核心系统研发与技术协作，推动复杂问题形成清晰、可靠的解决方案。', learn: '系统研发、技术方案与问题排查。', tags: ['系统研发', '问题排查'] }),
      member({ id: 'lu-donghua', name: '陆东华', department: '技术部', role: '技术研发', initials: '东华', photo: '/team/陆东华.png', bio: '参与产品功能建设与工程协作，让技术能力持续服务真实业务。', learn: '功能建设、工程协作与技术落地。', tags: ['功能建设', '工程协作'] }),
      member({ id: 'luo-jiyu', name: '罗吉煜', department: '技术部', role: '技术研发', initials: '吉煜', photo: '/team/罗吉煜.png', bio: '参与技术开发与产品迭代，支持系统能力稳定向前演进。', learn: '技术开发、产品迭代与协作支持。', tags: ['技术开发', '产品迭代'] }),
      member({ id: 'song-binbin', name: '宋斌斌', department: '技术部', role: '技术研发', initials: '斌斌', photo: '/team/宋斌斌.png', bio: '参与系统研发与技术支持，协助团队解决具体工程问题。', learn: '系统研发、工程问题与技术支持。', tags: ['系统研发', '技术支持'] }),
      member({ id: 'zhang-jianing', name: '张佳宁', department: '技术部', role: '技术研发', initials: '佳宁', photo: '/team/张佳宁.png', bio: '参与技术方案实现与迭代行动，坚持从事实出发还原问题、提取规律。', learn: '方案实现、问题分析与迭代行动。', tags: ['方案实现', '问题分析'] }),
      member({ id: 'zhu-wenqi', name: '朱文琪', department: '技术部', role: '技术研发', initials: '文琪', photo: '/team/朱文琪.png', bio: '参与产品技术与研发协作，支持团队将业务方法沉淀为系统能力。', learn: '产品技术、研发协作与能力沉淀。', tags: ['产品技术', '研发协作'] }),
    ],
  },
  {
    id: 'hr', title: '人力资源部', short: 'People', description: '让组织与每个人持续成长', color: 'rose',
    members: [
      member({ id: 'zhu-hui', name: '朱慧', department: '人力资源部', role: '人力资源部负责人', initials: '朱慧', photo: '/team/朱慧.png', isHead: true, bio: '负责组织发展、人才协作与员工支持，让团队在清晰、有序的环境里成长。', learn: '入职、组织制度、成长支持与员工关系。', tags: ['组织发展', '人才支持', '员工关系'] }),
      member({ id: 'chen-yujuan', name: '陈玉娟', department: '人力资源部', role: '人力行政协作', initials: '玉娟', photo: '/team/陈玉娟.png', bio: '参与人力行政与组织支持，为团队日常工作提供稳定服务。', learn: '人力行政、流程支持与日常协作。', tags: ['人力行政', '流程支持'] }),
      member({ id: 'hong-lanzhen', name: '洪兰珍', department: '人力资源部', role: '人力行政协作', initials: '兰珍', photo: '/team/洪兰珍.png', bio: '参与员工服务与组织协作，帮助每位同事更顺畅地工作。', learn: '员工服务、组织协作与工作支持。', tags: ['员工服务', '工作支持'] }),
    ],
  },
]

const allMembers = [...executiveMembers, ...departments.flatMap((department) => department.members)]

function PersonAvatar({ memberData, large = false }: { memberData: Member; large?: boolean }) {
  return (
    <span className={large ? 'person-avatar profile-avatar' : 'person-avatar'}>
      {memberData.photo ? <img src={memberData.photo} alt={`${memberData.name}头像`} /> : <span className="initials-avatar-content">{memberData.initials}</span>}
    </span>
  )
}

function OrganizationPage() {
  const [query, setQuery] = useState('')
  const [departmentFilter, setDepartmentFilter] = useState('all')
  const [selectedMember, setSelectedMember] = useState<Member | null>(null)

  const searchResults = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    return allMembers.filter((person) => {
      const matchesDepartment = departmentFilter === 'all' || person.department === departmentFilter
      const matchesQuery = !keyword || `${person.name}${person.role}${person.department}${person.tags.join('')}`.toLowerCase().includes(keyword)
      return matchesDepartment && matchesQuery
    })
  }, [departmentFilter, query])

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedMember(null)
    }
    window.addEventListener('keydown', closeOnEscape)
    return () => window.removeEventListener('keydown', closeOnEscape)
  }, [])

  const showMember = (person: Member) => setSelectedMember(person)

  return (
    <div className="site-shell organization-page-shell">
      <header className="topbar organization-topbar">
        <a className="brand" href="/" aria-label="返回 Orosaga 山海经首页">
          <img src="/favicon.svg" alt="" />
          <span className="brand-copy"><strong>Orosaga</strong><small>山海经</small></span>
        </a>
        <span className="organization-page-location">组织与协作</span>
        <a className="organization-back" href="/"><ArrowLeft size={16} /> 返回知识地图</a>
      </header>

      <main className="organization-page">
        <div className="organization-intro section-wrap">
          <div>
            <span className="eyebrow">People & collaboration · 组织与协作</span>
            <h1>找到一起把事情做好的人</h1>
            <p>组织架构不是一张静态名单，而是一张协作地图。先看清谁负责什么，再从一个具体的人开始认识团队。</p>
          </div>
          <div className="organization-intro-note"><Network size={20} /><span><strong>{allMembers.length} 位同事</strong> · 1 个总裁办 · 4 个业务部门</span></div>
        </div>

        <section className="organization-tools section-wrap" aria-label="组织筛选工具">
          <label className="organization-search">
            <Search size={17} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索姓名、部门或协作方向" aria-label="搜索姓名、部门或协作方向" />
          </label>
          <div className="organization-filters" role="tablist" aria-label="部门筛选">
            <button type="button" role="tab" aria-selected={departmentFilter === 'all'} className={departmentFilter === 'all' ? 'is-active' : ''} onClick={() => setDepartmentFilter('all')}>全部</button>
            {departments.map((department) => <button type="button" role="tab" aria-selected={departmentFilter === department.title} className={departmentFilter === department.title ? 'is-active' : ''} onClick={() => setDepartmentFilter(department.title)} key={department.id}>{department.title}</button>)}
          </div>
          {(query || departmentFilter !== 'all') && <span className="organization-result-count">找到 {searchResults.length} 位同事</span>}
        </section>

        <section className="org-chart section-wrap" aria-label="组织架构图">
          <div className="executive-node">
            <div className="executive-department-header">
              <div><span>Executive office</span><h2>总裁办</h2></div>
              <span className="department-count">{executiveMembers.length} 人</span>
            </div>
            <p className="executive-description">公司方向与经营协同</p>
            <div className="executive-people">
              {executiveMembers.map((person) => <button type="button" className="person-row executive-person" onClick={() => showMember(person)} key={person.id}><PersonAvatar memberData={person} /><span className="person-copy"><strong>{person.name}</strong><small>{person.role}</small></span>{person.isHead && <em>HEAD · 负责人</em>}<ArrowUpRight size={16} /></button>)}
            </div>
          </div>

          <div className="org-trunk" aria-hidden="true" />
          <div className="org-branches">
            {departments.map((department) => {
              const filteredMembers = department.members.filter((person) => searchResults.some((result) => result.id === person.id))
              const hiddenByFilter = departmentFilter !== 'all' && departmentFilter !== department.title
              if (hiddenByFilter) return null
              return (
                <section className={`department-panel department-${department.color}`} key={department.id} aria-labelledby={`${department.id}-title`}>
                  <div className="department-header">
                    <div><span>{department.short}</span><h2 id={`${department.id}-title`}>{department.title}</h2></div>
                    <span className="department-count">{filteredMembers.length} 人</span>
                  </div>
                  <p className="department-description">{department.description}</p>
                  <div className="department-members">
                    {filteredMembers.length > 0 ? filteredMembers.map((person) => (
                      <button type="button" className={person.isHead ? 'person-row is-head' : 'person-row'} onClick={() => showMember(person)} key={person.id}>
                        <PersonAvatar memberData={person} />
                        <span className="person-copy"><strong>{person.name}</strong><small>{person.role}</small></span>
                        {person.isHead && <em>HEAD · 负责人</em>}
                        <ChevronRight size={16} />
                      </button>
                    )) : <div className="organization-empty"><CircleUserRound size={19} /><span>没有匹配到这组同事</span></div>}
                  </div>
                </section>
              )
            })}
          </div>
        </section>

        <section className="organization-principles section-wrap" aria-label="协作原则">
          <div><Sparkles size={18} /><strong>先找负责人</strong><p>遇到跨部门问题，先从负责人的名片开始，知道谁可以给你方向。</p></div>
          <div><Users size={18} /><strong>再找协作者</strong><p>知道一件事由谁负责，也知道下一步应该和谁一起完成。</p></div>
          <div><BriefcaseBusiness size={18} /><strong>最后找资料</strong><p>把一次沟通沉淀成团队可复用的知识，而不是只停在聊天里。</p></div>
        </section>
      </main>

      <footer className="organization-page-footer">
        <a className="brand footer-brand" href="/"><img src="/favicon.svg" alt="" /><span className="brand-copy"><strong>Orosaga</strong><small>山海经</small></span></a>
        <p>组织与协作 · 找到同行者</p>
        <span>© 2026 Yishan Technology</span>
      </footer>

      {selectedMember && (
        <div className="profile-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedMember(null) }}>
          <article className="profile-card" role="dialog" aria-modal="true" aria-label={`${selectedMember.name}个人名片`}>
            <button type="button" className="profile-close icon-button" aria-label="关闭个人名片" onClick={() => setSelectedMember(null)}><X size={19} /></button>
            <div className="profile-card-top">
              <span className="profile-department">{selectedMember.department}</span>
              <PersonAvatar memberData={selectedMember} large />
              <span className="profile-role">{selectedMember.role}{selectedMember.isHead && <em>HEAD</em>}</span>
              <h2>{selectedMember.name}</h2>
            </div>
            <div className="profile-card-body">
              <div className="profile-fact"><MapPin size={15} /><span>所在团队</span><strong>{selectedMember.department}</strong></div>
              <div className="profile-fact"><Mail size={15} /><span>协作方式</span><strong>从具体问题开始沟通</strong></div>
              <p className="profile-bio">{selectedMember.bio}</p>
              <div className="profile-block"><span>可以向我了解</span><p>{selectedMember.learn}</p></div>
              <div className="profile-tags"><span>协作关键词</span><div>{selectedMember.tags.map((tag) => <b key={tag}>{tag}</b>)}</div></div>
              <button type="button" className="profile-action" onClick={() => setSelectedMember(null)}>返回组织架构 <ArrowLeft size={16} /></button>
            </div>
          </article>
        </div>
      )}
    </div>
  )
}

export default OrganizationPage
