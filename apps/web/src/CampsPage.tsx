import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpenText,
  MountainSnow,
  Route,
} from "lucide-react";
import type { Camp } from "@orosaga/contracts";
import { api } from "./lib/api";
import { distributeCamps } from "./lib/camps";

const altitudes = [
  ["山脚 · 初见", "从轻量分享开始认识同行者"],
  ["林线 · 深入", "沿着目录继续阅读与探索"],
  ["云间 · 进阶", "进入更完整的方法和复盘"],
  ["峰顶 · 远望", "连接长期积累与个人视角"],
] as const;

export default function CampsPage() {
  const camps = useQuery({
    queryKey: ["camps"],
    queryFn: () => api<Camp[]>("/api/v1/camps"),
  });
  if (camps.isPending)
    return <main className="route-state">正在读取知识营地…</main>;
  if (camps.isError)
    return (
      <main className="route-state">
        <h1>营地加载失败</h1>
        <button onClick={() => void camps.refetch()}>重试</button>
      </main>
    );
  const sections = distributeCamps(camps.data);
  const legacyTotal = camps.data.reduce(
    (sum, item) => sum + item.legacyDescendantCount,
    0,
  );
  const documentTotal = camps.data.reduce(
    (sum, item) => sum + item.documentCount,
    0,
  );
  return (
    <div className="site-shell camps-page-shell">
      <header className="topbar camps-topbar">
        <a className="brand" href="/">
          <img src="/favicon.svg" alt="" />
          <span className="brand-copy">
            <strong>Orosaga</strong>
            <small>山海经</small>
          </span>
        </a>
        <span className="camps-page-location">同事分享 · 营地地图</span>
        <a className="camps-back" href="/">
          <ArrowLeft size={16} /> 返回知识地图
        </a>
      </header>
      <main className="camps-page">
        <section className="camps-hero">
          <div className="camps-hero-terrain" aria-hidden="true">
            <span className="camps-sun" />
            <span className="camps-peak camps-peak-far" />
            <span className="camps-peak camps-peak-near" />
          </div>
          <div className="section-wrap camps-hero-inner">
            <div>
              <span className="eyebrow">Knowledge camps · 知识营地</span>
              <h1>沿着山路，拜访每一座知识营地</h1>
              <p>这里只同步目录元数据，正文与原始权限仍由飞书负责。</p>
            </div>
            <dl className="camps-hero-stats">
              <div>
                <dt>开放营地</dt>
                <dd>{camps.data.length}</dd>
              </div>
              <div>
                <dt>旧口径后代节点</dt>
                <dd>{legacyTotal}</dd>
              </div>
              <div>
                <dt>明确文档</dt>
                <dd>{documentTotal}</dd>
              </div>
            </dl>
          </div>
          {sections[0]?.length ? (
            <a className="camps-scroll-cue" href="#altitude-0">
              <Route size={16} /> 开始进山
            </a>
          ) : null}
        </section>
        {!camps.data.length ? (
          <section className="route-state">
            <h2>还没有开放的营地</h2>
            <p>管理员完成飞书知识空间配置后会自动出现。</p>
          </section>
        ) : (
          <div className="camps-trail-layout">
            <nav className="camps-route-rail">
              <span className="camps-route-title">
                <MountainSnow size={16} /> 营地路线
              </span>
              <ol>
                {altitudes.map((altitude, index) => (
                  <li key={altitude[0]}>
                    <a href={`#altitude-${index}`}>
                      <span>{index + 1}</span>
                      <strong>{altitude[0]}</strong>
                      <small>{sections[index]?.length ?? 0} 座</small>
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
            <div className="camps-trail">
              {altitudes.map((altitude, index) => (
                <section
                  className="camp-section"
                  id={`altitude-${index}`}
                  key={altitude[0]}
                >
                  <header className="camp-section-heading">
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <div>
                      <h2>{altitude[0]}</h2>
                      <p>{altitude[1]}</p>
                    </div>
                  </header>
                  <div className="camp-card-grid">
                    {sections[index]?.map((camp) => (
                      <a
                        className="camp-card"
                        href={camp.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        key={camp.id}
                      >
                        <span className="camp-number">{camp.displayCode}</span>
                        <BookOpenText size={20} />
                        <strong>{camp.title}</strong>
                        <p>
                          {camp.documentCount} 篇明确文档 · 旧口径{" "}
                          {camp.legacyDescendantCount}
                        </p>
                        <ArrowUpRight size={17} />
                      </a>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        )}
      </main>
      <footer className="camps-page-footer">
        <a className="brand footer-brand" href="/">
          <img src="/favicon.svg" alt="" />
          <span className="brand-copy">
            <strong>Orosaga</strong>
            <small>山海经</small>
          </span>
        </a>
        <p>知识营地 · 飞书原权限阅读</p>
        <span>© 2026 Yishan Technology</span>
      </footer>
    </div>
  );
}
