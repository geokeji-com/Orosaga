import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowUpRight,
  Boxes,
  BookOpenText,
  ChartNoAxesCombined,
  ClipboardCheck,
  Database,
  FileText,
  Radar,
  Workflow,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { api } from "./lib/api";

type SystemLink = {
  id: string;
  group: string;
  name: string;
  description: string;
  href: string;
  iconKey: string;
  environment: string;
};
const icons: Record<string, LucideIcon> = {
  database: Database,
  book: BookOpenText,
  workflow: Workflow,
  clipboard: ClipboardCheck,
  chart: ChartNoAxesCombined,
  radar: Radar,
  file: FileText,
};

export default function SystemsPage() {
  const links = useQuery({
    queryKey: ["system-links"],
    queryFn: () => api<SystemLink[]>("/api/v1/system-links"),
  });
  if (links.isPending)
    return <main className="route-state">正在读取系统入口…</main>;
  if (links.isError)
    return (
      <main className="route-state">
        <h1>系统入口加载失败</h1>
        <button onClick={() => void links.refetch()}>重试</button>
      </main>
    );
  const groups = links.data.reduce(
    (map, item) => map.set(item.group, [...(map.get(item.group) ?? []), item]),
    new Map<string, SystemLink[]>(),
  );
  return (
    <div className="site-shell systems-page-shell">
      <header className="topbar systems-topbar">
        <a className="brand" href="/">
          <img src="/favicon.svg" alt="" />
          <span className="brand-copy">
            <strong>Orosaga</strong>
            <small>山海经</small>
          </span>
        </a>
        <span className="systems-page-location">系统地图 · 工作台入口</span>
        <a className="systems-back" href="/">
          <ArrowLeft size={16} /> 返回知识地图
        </a>
      </header>
      <main className="systems-page">
        <section className="systems-hero">
          <div className="section-wrap systems-hero-inner">
            <div>
              <span className="eyebrow">
                <Boxes size={14} /> System map · 系统地图
              </span>
              <h1>
                先知道在哪做，
                <br />
                再开始把事做好
              </h1>
              <p>这里只展示管理员审批并启用的 HTTPS 入口。</p>
            </div>
            <dl className="systems-hero-stats">
              <div>
                <dt>安全入口</dt>
                <dd>{links.data.length}</dd>
              </div>
              <div>
                <dt>工作场景</dt>
                <dd>{groups.size}</dd>
              </div>
            </dl>
          </div>
        </section>
        <section
          className="systems-directory section-wrap"
          aria-label="按工作场景查看系统"
        >
          {!links.data.length && (
            <div className="route-state">
              <p>暂时没有可访问的系统入口。</p>
            </div>
          )}
          {[...groups.entries()].map(([group, entries], groupIndex) => (
            <section className="systems-group" key={group}>
              <header className="systems-group-heading">
                <span>{String(groupIndex + 1).padStart(2, "0")}</span>
                <div>
                  <h2>{group}</h2>
                  <p>根据当前工作进入对应系统。</p>
                </div>
              </header>
              <div className="systems-list-grid">
                {entries.map((item) => {
                  const Icon = icons[item.iconKey] ?? Boxes;
                  return (
                    <a
                      className="system-entry"
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      key={item.id}
                    >
                      <span className="system-entry-icon">
                        <Icon size={20} />
                      </span>
                      <div className="system-entry-copy">
                        <span>{item.environment}</span>
                        <strong>{item.name}</strong>
                        <p>{item.description}</p>
                      </div>
                      <span className="system-entry-action">
                        <ArrowUpRight size={17} />
                      </span>
                    </a>
                  );
                })}
              </div>
            </section>
          ))}
        </section>
      </main>
      <footer className="systems-page-footer">
        <a className="brand footer-brand" href="/">
          <img src="/favicon.svg" alt="" />
          <span className="brand-copy">
            <strong>Orosaga</strong>
            <small>山海经</small>
          </span>
        </a>
        <p>系统地图 · 安全入口</p>
        <span>© 2026 Yishan Technology</span>
      </footer>
    </div>
  );
}
