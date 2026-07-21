import { useEffect, useState } from 'react'
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpenText,
  ExternalLink,
  MapPin,
  MountainSnow,
  Route,
  TentTree,
} from 'lucide-react'
import { camps } from './camps.generated'

const trailSections = [
  { id: 'foothill', number: '01', label: '低海拔', terrain: '山麓', altitude: '680 M' },
  { id: 'forest', number: '02', label: '中低海拔', terrain: '林间', altitude: '1,240 M' },
  { id: 'ridge', number: '03', label: '中高海拔', terrain: '山脊', altitude: '1,860 M' },
  { id: 'summit', number: '04', label: '高海拔', terrain: '峰前', altitude: '2,430 M' },
] as const

function CampsPage() {
  const [activeSection, setActiveSection] = useState<(typeof trailSections)[number]['id']>(trailSections[0].id)
  const totalDocuments = camps.reduce((total, camp) => total + camp.documentCount, 0)

  useEffect(() => {
    const sections = document.querySelectorAll<HTMLElement>('[data-camp-section]')
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible?.target.id) setActiveSection(visible.target.id as (typeof trailSections)[number]['id'])
      },
      { rootMargin: '-25% 0px -45% 0px', threshold: [0.1, 0.35, 0.6] },
    )

    sections.forEach((section) => observer.observe(section))
    return () => observer.disconnect()
  }, [])

  return (
    <div className="site-shell camps-page-shell">
      <header className="topbar camps-topbar">
        <a className="brand" href="/" aria-label="返回 Orosaga 山海经首页">
          <img src="/favicon.svg" alt="" />
          <span className="brand-copy"><strong>Orosaga</strong><small>山海经</small></span>
        </a>
        <span className="camps-page-location">同事分享 · 营地地图</span>
        <a className="camps-back" href="/"><ArrowLeft size={16} /> 返回知识地图</a>
      </header>

      <main className="camps-page">
        <section className="camps-hero" aria-labelledby="camps-title">
          <div className="camps-hero-terrain" aria-hidden="true">
            <span className="camps-sun" />
            <span className="camps-peak camps-peak-far" />
            <span className="camps-peak camps-peak-near" />
          </div>
          <div className="section-wrap camps-hero-inner">
            <div>
              <span className="eyebrow"><BookOpenText size={14} /> Field notes · 同事分享</span>
              <h1 id="camps-title">沿着山路，拜访每一座知识营地</h1>
              <p>营地海拔由飞书目录内的文档总数决定。越往上走，同行者沉淀的分享越多；选一座营地进入，看看他们最近在思考什么。</p>
            </div>
            <dl className="camps-hero-stats">
              <div><dt>开放营地</dt><dd>{camps.length}</dd></div>
              <div><dt>收录分享</dt><dd>{totalDocuments}</dd></div>
              <div><dt>排序依据</dt><dd>文档数量</dd></div>
            </dl>
          </div>
          <a className="camps-scroll-cue" href={`#${trailSections[0].id}`}><Route size={16} /> 开始进山</a>
        </section>

        <div className="camps-trail-layout">
          <nav className="camps-route-rail" aria-label="营地路线">
            <span className="camps-route-title"><MountainSnow size={16} /> 营地路线</span>
            <ol>
              {trailSections.map((section) => (
                <li className={activeSection === section.id ? 'is-active' : ''} key={section.id}>
                  <a href={`#${section.id}`} aria-current={activeSection === section.id ? 'location' : undefined}>
                    <span>{section.number}</span><strong>{section.label}</strong><small>{section.altitude}</small>
                  </a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="camps-trail">
            {trailSections.map((section, sectionIndex) => {
              const sectionCamps = camps.slice(sectionIndex * 4, sectionIndex * 4 + 4)
              const minimumDocuments = sectionCamps[0]?.documentCount ?? 0
              const maximumDocuments = sectionCamps.at(-1)?.documentCount ?? 0
              const documentRange = minimumDocuments === maximumDocuments
                ? `${minimumDocuments} 篇分享`
                : `${minimumDocuments}–${maximumDocuments} 篇分享`
              return (
                <section
                  className={`camp-altitude camp-altitude-${sectionIndex + 1}`}
                  id={section.id}
                  data-camp-section
                  aria-labelledby={`${section.id}-title`}
                  key={section.id}
                >
                  <div className="camp-contours" aria-hidden="true"><i /><i /><i /></div>
                  <header className="camp-altitude-heading">
                    <span>{section.number} · {section.altitude}</span>
                    <h2 id={`${section.id}-title`}>{section.terrain} · {section.label}</h2>
                    <p>本档营地收录 {documentRange}，按文档数量由少到多排列</p>
                  </header>
                  <div className="camp-field">
                    <span className="camp-route-line" aria-hidden="true" />
                    {sectionCamps.map((camp, campIndex) => (
                      <a
                        className={`camp-marker camp-position-${campIndex + 1}`}
                        href={camp.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={`打开${camp.title}的飞书分享空间`}
                        data-document-count={camp.documentCount}
                        key={camp.id}
                      >
                        <span className="camp-pin"><TentTree size={22} strokeWidth={1.7} /></span>
                        <span className="camp-card">
                          <small><MapPin size={11} /> {camp.id}</small>
                          <strong>{camp.title}</strong>
                          <em>{camp.documentCount} 篇分享</em>
                          <span>进入营地 <ArrowUpRight size={14} /></span>
                        </span>
                      </a>
                    ))}
                  </div>
                </section>
              )
            })}
          </div>
        </div>

        <section className="camps-ending" aria-label="飞书知识库入口">
          <TentTree size={24} />
          <div><span>Base camp · 个人分享</span><strong>这里的路书仍在持续生长</strong></div>
          <a href="https://wanhuxian.feishu.cn/wiki/MmcRw3MgZiJwqIkTA15clNDpnvg" target="_blank" rel="noopener noreferrer">
            打开飞书父级目录 <ExternalLink size={15} />
          </a>
        </section>
      </main>

      <footer className="camps-page-footer">
        <a className="brand footer-brand" href="/"><img src="/favicon.svg" alt="" /><span className="brand-copy"><strong>Orosaga</strong><small>山海经</small></span></a>
        <p>同事分享 · 知识营地地图</p>
        <span>© 2026 Yishan Technology</span>
      </footer>
    </div>
  )
}

export default CampsPage
