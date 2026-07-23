import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  CompanyContentPayload,
  ContentPage,
  KnowledgeSource,
  PortalContentPayload,
} from "@orosaga/contracts";
import { ArrowLeft, History, Save, Settings, Undo2 } from "lucide-react";
import { useMe } from "../auth/AuthGate";
import { AccountMenu } from "../components/AccountMenu";
import { ApiError, api, jsonBody } from "../lib/api";
import { CompanyContentFields } from "./CompanyContentFields";

type Revision = {
  id: string;
  version: number;
  changeSummary: string;
  createdAt: string;
};

function isCompanyContent(
  content: PortalContentPayload,
): content is CompanyContentPayload {
  return "schemaVersion" in content;
}

export default function AdminPage() {
  const client = useQueryClient();
  const me = useMe();
  const [selectedSlug, setSelectedSlug] = useState<"company" | "home">(
    "company",
  );
  const page = useQuery({
    queryKey: ["page", selectedSlug],
    queryFn: () => api<ContentPage>(`/api/v1/pages/${selectedSlug}`),
  });
  const revisions = useQuery({
    queryKey: ["page-revisions", page.data?.id],
    queryFn: () =>
      api<Revision[]>(`/api/v1/admin/pages/${page.data!.id}/revisions`),
    enabled: Boolean(page.data?.id),
  });
  const [draft, setDraft] = useState<PortalContentPayload | null>(null);
  const [summary, setSummary] = useState("更新公司页");
  const content = draft ?? page.data?.content ?? null;

  const save = useMutation({
    mutationFn: () =>
      api<{ id: string; version: number }>(
        `/api/v1/admin/pages/${page.data!.id}`,
        {
          method: "PUT",
          body: jsonBody({
            expectedVersion: page.data!.version,
            content,
            changeSummary: summary,
          }),
        },
      ),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["page", selectedSlug] });
      await client.invalidateQueries({ queryKey: ["page-revisions"] });
      setDraft(null);
    },
  });
  const rollback = useMutation({
    mutationFn: (revisionId: string) =>
      api(`/api/v1/admin/pages/${page.data!.id}/rollback`, {
        method: "POST",
        body: jsonBody({ revisionId, expectedVersion: page.data!.version }),
      }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["page", selectedSlug] });
      await client.invalidateQueries({ queryKey: ["page-revisions"] });
    },
  });
  const sync = useMutation({
    mutationFn: (kind: "organization" | "wiki") =>
      api(`/api/v1/admin/sync/${kind}`, { method: "POST" }),
  });
  const sources = useQuery({
    queryKey: ["knowledge-sources"],
    queryFn: () => api<KnowledgeSource[]>("/api/v1/admin/knowledge-sources"),
    enabled: me.data?.role === "ADMIN",
  });

  if (page.isPending || !content)
    return <main className="route-state">正在打开内容后台…</main>;
  if (page.isError)
    return (
      <main className="route-state">
        <h1>后台加载失败</h1>
        <p>{page.error.message}</p>
      </main>
    );
  const conflict = save.error instanceof ApiError && save.error.status === 409;
  return (
    <div className="admin-shell">
      <header className="admin-topbar">
        <a href="/">
          <ArrowLeft size={16} /> 返回门户
        </a>
        <strong>Orosaga 内容后台</strong>
        <AccountMenu />
      </header>
      <main className="admin-layout">
        <section className="admin-editor">
          <span className="eyebrow">
            <Settings size={14} /> 编辑即发布
          </span>
          <label>
            内容页面
            <select
              value={selectedSlug}
              onChange={(event) => {
                setDraft(null);
                setSelectedSlug(event.target.value as "company" | "home");
              }}
            >
              <option value="company">公司页</option>
              <option value="home">首页</option>
            </select>
          </label>
          <h1>{selectedSlug === "company" ? "公司页" : "首页"}</h1>
          <p>保存后立即对全员生效，并自动创建不可变版本。</p>
          <label>
            标题
            <input
              value={content.title}
              onChange={(event) =>
                setDraft({ ...content, title: event.target.value })
              }
            />
          </label>
          <label>
            {isCompanyContent(content) ? "导语" : "摘要"}
            <textarea
              rows={5}
              value={isCompanyContent(content) ? content.lead : content.summary}
              onChange={(event) => {
                const value = event.target.value;
                setDraft(
                  isCompanyContent(content)
                    ? { ...content, lead: value }
                    : { ...content, summary: value },
                );
              }}
            />
          </label>
          {isCompanyContent(content) && (
            <CompanyContentFields content={content} setDraft={setDraft} />
          )}
          <label>
            变更摘要
            <input
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
            />
          </label>
          {conflict && (
            <div className="admin-alert">
              内容已被他人更新，请刷新后合并修改，系统没有覆盖对方版本。
            </div>
          )}
          {save.isError && !conflict && (
            <div className="admin-alert">{save.error.message}</div>
          )}
          <button
            className="primary-button"
            disabled={save.isPending}
            onClick={() => save.mutate()}
          >
            <Save size={16} />{" "}
            {save.isPending
              ? "发布中…"
              : `立即发布版本 ${page.data.version + 1}`}
          </button>
        </section>
        <aside className="admin-history">
          <h2>
            <History size={18} /> 历史版本
          </h2>
          <p>当前版本：{page.data.version}</p>
          {revisions.data?.map((revision) => (
            <article key={revision.id}>
              <div>
                <strong>v{revision.version}</strong>
                <time>
                  {new Date(revision.createdAt).toLocaleString("zh-CN")}
                </time>
              </div>
              <p>{revision.changeSummary}</p>
              {revision.version !== page.data.version && (
                <button
                  disabled={rollback.isPending}
                  onClick={() => rollback.mutate(revision.id)}
                >
                  <Undo2 size={14} /> 回滚到此版本
                </button>
              )}
            </article>
          ))}
        </aside>
        {me.data?.role === "ADMIN" && (
          <section className="admin-operations">
            <h2>管理员操作</h2>
            <p>手工同步会进入独立 Worker，并由数据库锁防止重复执行。</p>
            <div>
              <button
                disabled={sync.isPending}
                onClick={() => sync.mutate("organization")}
              >
                同步飞书组织
              </button>
              <button
                disabled={sync.isPending}
                onClick={() => sync.mutate("wiki")}
              >
                同步 Wiki 营地
              </button>
            </div>
            {sync.isSuccess && <span>同步请求已提交。</span>}
            {sync.isError && <span>{sync.error.message}</span>}
            <h3>飞书知识源</h3>
            <p>排除规则只接受明确的节点 token，不按标题匹配。</p>
            {sources.data?.map((source) => (
              <KnowledgeSourceEditor key={source.id} source={source} />
            ))}
            <NewKnowledgeSource />
          </section>
        )}
      </main>
    </div>
  );
}

function KnowledgeSourceEditor({ source }: { source: KnowledgeSource }) {
  const client = useQueryClient();
  const [name, setName] = useState(source.name);
  const [spaceId, setSpaceId] = useState(source.spaceId);
  const [rootNodeToken, setRootNodeToken] = useState(source.rootNodeToken);
  const [excluded, setExcluded] = useState(source.excludedTokens.join("\n"));
  const [enabled, setEnabled] = useState(source.enabled);
  const save = useMutation({
    mutationFn: () =>
      api(`/api/v1/admin/knowledge-sources/${source.id}`, {
        method: "PUT",
        body: jsonBody({
          expectedVersion: source.version,
          name,
          spaceId,
          rootNodeToken,
          excludedTokens: excluded
            .split(/\s+/)
            .map((token) => token.trim())
            .filter(Boolean),
          intervalMins: source.intervalMins,
          enabled,
        }),
      }),
    onSuccess: () =>
      client.invalidateQueries({ queryKey: ["knowledge-sources"] }),
  });
  return (
    <fieldset className="admin-source">
      <legend>
        {source.name} · v{source.version}
      </legend>
      <label>
        名称
        <input value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label>
        Space ID
        <input
          value={spaceId}
          onChange={(event) => setSpaceId(event.target.value)}
        />
      </label>
      <label>
        根节点 token
        <input
          value={rootNodeToken}
          onChange={(event) => setRootNodeToken(event.target.value)}
        />
      </label>
      <label>
        排除节点 token（每行一个）
        <textarea
          rows={4}
          value={excluded}
          onChange={(event) => setExcluded(event.target.value)}
        />
      </label>
      <label>
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
        />
        启用同步
      </label>
      <button disabled={save.isPending} onClick={() => save.mutate()}>
        保存知识源配置
      </button>
      {save.isError && <span>{save.error.message}</span>}
    </fieldset>
  );
}

function NewKnowledgeSource() {
  const client = useQueryClient();
  const [name, setName] = useState("");
  const [spaceId, setSpaceId] = useState("");
  const [rootNodeToken, setRootNodeToken] = useState("");
  const create = useMutation({
    mutationFn: () =>
      api("/api/v1/admin/knowledge-sources", {
        method: "POST",
        body: jsonBody({
          name,
          spaceId,
          rootNodeToken,
          excludedTokens: [],
          intervalMins: 30,
          enabled: true,
        }),
      }),
    onSuccess: async () => {
      setName("");
      setSpaceId("");
      setRootNodeToken("");
      await client.invalidateQueries({ queryKey: ["knowledge-sources"] });
    },
  });
  return (
    <fieldset className="admin-source">
      <legend>新增知识源</legend>
      <label>
        名称
        <input value={name} onChange={(event) => setName(event.target.value)} />
      </label>
      <label>
        Space ID
        <input
          value={spaceId}
          onChange={(event) => setSpaceId(event.target.value)}
        />
      </label>
      <label>
        根节点 token
        <input
          value={rootNodeToken}
          onChange={(event) => setRootNodeToken(event.target.value)}
        />
      </label>
      <button
        disabled={create.isPending || !name || !spaceId || !rootNodeToken}
        onClick={() => create.mutate()}
      >
        创建并启用
      </button>
      {create.isError && <span>{create.error.message}</span>}
    </fieldset>
  );
}
