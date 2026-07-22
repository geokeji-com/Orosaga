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
import { Brand } from "./components/Brand";
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
const groupDescriptions = [
  "先把可用的数据、问句与好内容放到该放的位置，后面的判断才有依据。",
  "把日常动作、任务推进和提交节点集中到能被团队看见的工作台。",
  "从数据变化里找到下一步，再把阶段性结果整理成可以被客户和团队理解的交付。",
];
const systemLabels: Record<string, string> = {
  database: "数据采集",
  book: "内容资产",
  workflow: "辅助执行",
  clipboard: "运营提交",
  chart: "数据分析",
  radar: "客户看板",
  file: "报告交付",
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
        <Brand />
        <span className="systems-page-location">系统地图 · 工作台入口</span>
        <a className="systems-back" href="/">
          <ArrowLeft size={16} /> 返回知识地图
        </a>
      </header>
      <main className="systems-page">
        <section className="systems-hero" aria-labelledby="systems-title">
          <div className="section-wrap systems-hero-inner">
            <div>
              <span className="eyebrow">
                <Boxes size={14} /> System map · 系统地图
              </span>
              <h1 id="systems-title">
                先知道在哪做，
                <br />
                再开始把事做好
              </h1>
              <p>
                七个工作台按实际工作场景放在一起。先选你现在所处的阶段，再进入对应系统完成下一步。
              </p>
            </div>
            <dl className="systems-hero-stats" aria-label="系统地图概览">
              <div>
                <dt>系统入口</dt>
                <dd>{links.data.length}</dd>
              </div>
              <div>
                <dt>工作场景</dt>
                <dd>{groups.size}</dd>
              </div>
              <div>
                <dt>使用方式</dt>
                <dd>按任务进入</dd>
              </div>
            </dl>
          </div>
        </section>
        <section
          className="systems-directory section-wrap"
          aria-label="按工作场景查看系统"
        >
          <div className="systems-directory-intro">
            <span>工作路径</span>
            <p>
              不是每个系统都需要每天打开。根据你正要完成的工作，进入对应入口即可。
            </p>
          </div>
          {!links.data.length && (
            <div className="route-state">
              <p>暂时没有可访问的系统入口。</p>
            </div>
          )}
          {[...groups.entries()].map(([group, entries], groupIndex) => (
            <section
              className="systems-group"
              aria-labelledby={`systems-group-${groupIndex + 1}`}
              key={group}
            >
              <header className="systems-group-heading">
                <span>{String(groupIndex + 1).padStart(2, "0")}</span>
                <div>
                  <h2 id={`systems-group-${groupIndex + 1}`}>{group}</h2>
                  <p>
                    {groupDescriptions[groupIndex] ??
                      "根据当前工作进入对应系统。"}
                  </p>
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
                        <Icon size={20} strokeWidth={1.75} />
                      </span>
                      <div className="system-entry-copy">
                        <span title={item.environment}>
                          {systemLabels[item.iconKey] ?? item.environment}
                        </span>
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
        <Brand className="footer-brand" />
        <p>系统地图 · 按场景持续校准</p>
        <span>© 2026 Yishan Technology</span>
      </footer>
    </div>
  );
}
