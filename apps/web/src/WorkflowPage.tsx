import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowUpRight,
  Boxes,
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
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useParams } from "react-router-dom";
import { Brand } from "./components/Brand";
import { api } from "./lib/api";

type Stage = {
  id: string;
  title: string;
  shortTitle: string;
  summary: string;
  owner: string;
  system: string;
  inputs: string[];
  actions: string[];
  done: string[];
  outputs: string[];
  next: string;
  position: number;
  iconKey?: string;
};
const stageIcons: Record<string, LucideIcon> = {
  clipboard: ClipboardCheck,
  database: Database,
  file: PenTool,
  workflow: Send,
  radar: Radar,
  chart: ChartNoAxesCombined,
};
type Workflow = {
  id: string;
  slug: string;
  title: string;
  version: number;
  stages: Stage[];
};

export default function WorkflowPage() {
  const { slug = "geo-operating" } = useParams();
  const workflow = useQuery({
    queryKey: ["workflow", slug],
    queryFn: () => api<Workflow>(`/api/v1/workflows/${slug}`),
  });
  const [active, setActive] = useState("");
  if (workflow.isPending)
    return <main className="route-state">正在读取工作流…</main>;
  if (workflow.isError)
    return (
      <main className="route-state">
        <h1>工作流加载失败</h1>
        <button onClick={() => void workflow.refetch()}>重试</button>
      </main>
    );
  if (!workflow.data.stages.length)
    return (
      <main className="route-state">
        <h1>工作流尚未配置</h1>
        <a href="/">返回首页</a>
      </main>
    );
  const current =
    workflow.data.stages.find((item) => item.id === active) ??
    workflow.data.stages[0]!;
  return (
    <div className="site-shell workflow-page-shell">
      <header className="topbar workflow-topbar">
        <Brand />
        <span className="workflow-page-location">运营工作流</span>
        <a className="workflow-back" href="/">
          <ArrowLeft size={16} /> 返回知识地图
        </a>
      </header>
      <main className="workflow-page">
        <section
          className="workflow-page-hero"
          aria-labelledby="workflow-page-title"
        >
          <div className="section-wrap workflow-page-hero-inner">
            <div>
              <span className="eyebrow">Operating workflow · 运营工作流</span>
              <h1 id="workflow-page-title">把一次项目，完整地走一遍</h1>
              <p>
                从客户接入到策略迭代，六段流程把输入、动作、完成标准和交接产物连成一个闭环。
              </p>
            </div>
            <div className="workflow-page-note">
              <ShieldCheck size={19} />
              <p>
                <strong>共同约定</strong>
                关键节点由人确认，过程由系统追溯。
              </p>
            </div>
          </div>
        </section>
        <section
          className="workflow-page-content section-wrap"
          aria-label="运营工作流详情"
        >
          <div className="workflow-summary" aria-label="工作流概览">
            <div>
              <strong>{workflow.data.stages.length}</strong>
              <span>条标准流程</span>
            </div>
            <div>
              <strong>
                {workflow.data.stages.reduce(
                  (sum, item) => sum + item.done.length,
                  0,
                )}
              </strong>
              <span>项完成标准</span>
            </div>
            <div>
              <strong>1</strong>
              <span>个数据闭环</span>
            </div>
            <div className="workflow-principle">
              <ShieldCheck size={18} />
              <span>选择当前阶段，先确认做到什么才算完成</span>
            </div>
          </div>
          <div
            className="workflow-stage-nav"
            role="tablist"
            aria-label="选择运营阶段"
          >
            {workflow.data.stages.map((stage, index) => {
              const Icon = stageIcons[stage.iconKey ?? ""] ?? ClipboardCheck;
              return (
                <button
                  type="button"
                  role="tab"
                  aria-selected={stage.id === current.id}
                  aria-controls="workflow-panel"
                  className={
                    stage.id === current.id
                      ? "workflow-stage is-active"
                      : "workflow-stage"
                  }
                  onClick={() => setActive(stage.id)}
                  key={stage.id}
                >
                  <span className="stage-index">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <span className="stage-icon">
                    <Icon size={17} strokeWidth={1.8} />
                  </span>
                  <strong>{stage.shortTitle}</strong>
                  <ChevronRight size={15} className="stage-chevron" />
                </button>
              );
            })}
          </div>
          <div
            className="workflow-panel"
            id="workflow-panel"
            role="tabpanel"
            key={current.id}
          >
            <div className="workflow-panel-main">
              <div className="workflow-panel-title">
                <span>
                  {String(current.position + 1).padStart(2, "0")} /{" "}
                  {String(workflow.data.stages.length).padStart(2, "0")}
                </span>
                <h2>{current.title}</h2>
                <p>{current.summary}</p>
              </div>
              <dl className="workflow-meta">
                <div>
                  <dt>主责角色</dt>
                  <dd>
                    <Users size={15} />
                    {current.owner}
                  </dd>
                </div>
                <div>
                  <dt>工作系统</dt>
                  <dd>
                    <Boxes size={15} />
                    {current.system}
                  </dd>
                </div>
              </dl>
              <div className="workflow-output">
                <span>关键产物</span>
                <div>
                  {current.outputs.map((item) => (
                    <b key={item}>{item}</b>
                  ))}
                </div>
              </div>
              <div className="workflow-handoff">
                <span>完成后</span>
                <strong>{current.next}</strong>
                <ArrowUpRight size={17} />
              </div>
            </div>
            <div className="workflow-checkpoints">
              <div className="workflow-checkpoint">
                <span className="checkpoint-label">开始前确认</span>
                <ul>
                  {current.inputs.map((item) => (
                    <li key={item}>
                      <span />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="workflow-checkpoint action-list">
                <span className="checkpoint-label">本阶段动作</span>
                <ol>
                  {current.actions.map((item, index) => (
                    <li key={item}>
                      <span>{index + 1}</span>
                      {item}
                    </li>
                  ))}
                </ol>
              </div>
              <div className="workflow-checkpoint done-list">
                <span className="checkpoint-label">
                  <CheckCircle2 size={15} />
                  完成标准
                </span>
                <ul>
                  {current.done.map((item) => (
                    <li key={item}>
                      <CheckCircle2 size={16} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="workflow-page-footer">
        <Brand className="footer-brand" />
        <p>运营工作流 · 持续校准中</p>
        <span>© 2026 Yishan Technology</span>
      </footer>
    </div>
  );
}
