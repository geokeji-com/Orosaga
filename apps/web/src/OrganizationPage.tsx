import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
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
} from "lucide-react";
import type { Department, Employee } from "@orosaga/contracts";
import { api } from "./lib/api";
import { compareEmployees } from "./organization-order";
import { Brand } from "./components/Brand";
import { AccountMenu } from "./components/AccountMenu";

async function allMembers() {
  const items: Employee[] = [];
  let cursor: string | null = null;
  do {
    const suffix: string = cursor
      ? `?cursor=${encodeURIComponent(cursor)}`
      : "";
    const response: { items: Employee[]; nextCursor: string | null } =
      await api(`/api/v1/organization/members${suffix}`);
    items.push(...response.items);
    cursor = response.nextCursor;
  } while (cursor);
  return items;
}

function departmentPresentation(name: string) {
  if (/销售/.test(name))
    return {
      order: 1,
      color: "blue",
      short: "Sales",
      description: "连接客户需求与公司解决方案",
    };
  if (/运营/.test(name))
    return {
      order: 2,
      color: "green",
      short: "Operations",
      description: "把客户目标变成可交付的结果",
    };
  if (/技术|研发|产品/.test(name))
    return {
      order: 3,
      color: "violet",
      short: "Technology",
      description: "把方法沉淀成系统与工具",
    };
  if (/人力|行政|人才/.test(name))
    return {
      order: 4,
      color: "rose",
      short: "People",
      description: "让组织与每个人持续成长",
    };
  return {
    order: 10,
    color: "amber",
    short: "Team",
    description: "连接专业能力与团队共同目标",
  };
}

function Avatar({
  person,
  large = false,
}: {
  person: Employee;
  large?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const initials = person.displayName.replace(/\s+.*/, "").slice(-2);
  return (
    <span className={large ? "person-avatar profile-avatar" : "person-avatar"}>
      {person.avatarUrl && !failed ? (
        <img
          src={person.avatarUrl}
          alt={`${person.displayName}头像`}
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="initials-avatar-content">{initials}</span>
      )}
    </span>
  );
}

function ProfileModal({
  person,
  close,
}: {
  person: Employee;
  close: () => void;
}) {
  const card = useRef<HTMLElement>(null);
  const previous = useRef<HTMLElement | null>(null);
  useEffect(() => {
    previous.current = document.activeElement as HTMLElement;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    card.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
      if (event.key !== "Tab" || !card.current) return;
      const focusable = [
        ...card.current.querySelectorAll<HTMLElement>("button,a"),
      ];
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", keydown);
    return () => {
      document.body.style.overflow = oldOverflow;
      document.removeEventListener("keydown", keydown);
      previous.current?.focus();
    };
  }, [close]);
  return (
    <div
      className="profile-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <article
        ref={card}
        className="profile-card"
        role="dialog"
        aria-modal="true"
        aria-label={`${person.displayName}个人名片`}
      >
        <button
          className="profile-close icon-button"
          aria-label="关闭个人名片"
          onClick={close}
        >
          <X size={19} />
        </button>
        <div className="profile-card-top">
          <span className="profile-department">{person.departmentName}</span>
          <Avatar person={person} large />
          <span className="profile-role">{person.title}</span>
          <h2>{person.displayName}</h2>
        </div>
        <div className="profile-card-body">
          <div className="profile-fact">
            <MapPin size={15} />
            <span>所在团队</span>
            <strong>{person.departmentName || "未分配部门"}</strong>
          </div>
          <div className="profile-fact">
            <Mail size={15} />
            <span>协作方式</span>
            <strong>从具体问题开始沟通</strong>
          </div>
          <p className="profile-bio">
            {person.bio || "这位同事尚未补充个人简介。"}
          </p>
          <div className="profile-block">
            <span>可以向我了解</span>
            <p>{person.learn || "暂未填写"}</p>
          </div>
          <div className="profile-tags">
            <span>协作关键词</span>
            <div>
              {person.tags.map((tag) => (
                <b key={tag}>{tag}</b>
              ))}
            </div>
          </div>
          <button className="profile-action" onClick={close}>
            返回组织架构 <ArrowLeft size={16} />
          </button>
        </div>
      </article>
    </div>
  );
}

export default function OrganizationPage() {
  const departments = useQuery({
    queryKey: ["departments"],
    queryFn: () => api<Department[]>("/api/v1/organization/departments"),
  });
  const members = useQuery({ queryKey: ["members"], queryFn: allMembers });
  const [query, setQuery] = useState("");
  const [departmentId, setDepartmentId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Employee | null>(null);
  const visible = useMemo(
    () =>
      (members.data ?? [])
        .filter((person) => {
          const words =
            `${person.displayName}${person.title}${person.departmentName}${person.tags.join("")}`.toLowerCase();
          return (
            (!departmentId || person.departmentId === departmentId) &&
            (!query.trim() || words.includes(query.trim().toLowerCase()))
          );
        })
        .sort(compareEmployees),
    [departmentId, members.data, query],
  );
  const orderedDepartments = departments.data ?? [];
  const allPeople = members.data ?? [];
  const executiveDepartment =
    orderedDepartments.find((item) => /总裁|管理层|管理部/.test(item.name)) ??
    orderedDepartments.find(
      (item) =>
        !item.parentId &&
        allPeople.some((person) => person.departmentId === item.id),
    );
  const executivePeople = executiveDepartment
    ? visible.filter((person) => person.departmentId === executiveDepartment.id)
    : [];
  const branchDepartments = orderedDepartments
    .filter((item) => item.id !== executiveDepartment?.id)
    .sort(
      (left, right) =>
        departmentPresentation(left.name).order -
        departmentPresentation(right.name).order,
    );

  if (departments.isPending || members.isPending)
    return <main className="route-state">正在读取组织资料…</main>;
  if (departments.isError || members.isError)
    return (
      <main className="route-state">
        <h1>组织资料加载失败</h1>
        <button
          onClick={() => {
            void departments.refetch();
            void members.refetch();
          }}
        >
          重试
        </button>
      </main>
    );

  return (
    <div className="site-shell organization-page-shell">
      <header className="topbar organization-topbar">
        <Brand />
        <span className="organization-page-location">组织与协作</span>
        <div className="topbar-account-actions">
          <a className="organization-back" href="/">
            <ArrowLeft size={16} /> 返回知识地图
          </a>
          <AccountMenu />
        </div>
      </header>
      <main className="organization-page">
        <div className="organization-intro section-wrap">
          <div>
            <span className="eyebrow">People & collaboration · 组织与协作</span>
            <h1>找到一起把事情做好的人</h1>
            <p>
              组织架构不是一张静态名单，而是一张协作地图。先看清谁负责什么，再从一个具体的人开始认识团队。
            </p>
          </div>
          <div className="organization-intro-note">
            <Network size={20} />
            <span>
              <strong>{allPeople.length} 位同事</strong>
              {executiveDepartment && ` · 1 个${executiveDepartment.name}`}
              {` · ${branchDepartments.length} 个业务部门`}
            </span>
          </div>
        </div>
        <section
          className="organization-tools section-wrap"
          aria-label="组织筛选工具"
        >
          <label className="organization-search">
            <Search size={17} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索姓名、部门或协作方向"
            />
          </label>
          <div className="organization-filters" aria-label="部门筛选">
            <button
              className={!departmentId ? "is-active" : ""}
              aria-pressed={!departmentId}
              onClick={() => setDepartmentId(null)}
            >
              全部
            </button>
            {branchDepartments.map((item) => (
              <button
                key={item.id}
                className={departmentId === item.id ? "is-active" : ""}
                aria-pressed={departmentId === item.id}
                onClick={() => setDepartmentId(item.id)}
              >
                {item.name}
              </button>
            ))}
          </div>
          {(query || departmentId) && (
            <span className="organization-result-count">
              找到 {visible.length} 位同事
            </span>
          )}
        </section>
        <section className="org-chart section-wrap" aria-label="组织架构图">
          {executiveDepartment &&
            (!departmentId || departmentId === executiveDepartment.id) && (
              <div className="executive-node">
                <div className="executive-department-header">
                  <div>
                    <span>Executive office</span>
                    <h2>{executiveDepartment.name}</h2>
                  </div>
                  <span className="department-count">
                    {executivePeople.length} 人
                  </span>
                </div>
                <p className="executive-description">公司方向与经营协同</p>
                <div className="executive-people">
                  {executivePeople.map((person, index) => (
                    <button
                      type="button"
                      className="person-row executive-person"
                      onClick={() => setSelected(person)}
                      key={person.id}
                    >
                      <Avatar person={person} />
                      <span className="person-copy">
                        <strong>{person.displayName}</strong>
                        <small>{person.title}</small>
                      </span>
                      {(person.role === "ADMIN" || index === 0) && (
                        <em>HEAD · 负责人</em>
                      )}
                      <ArrowUpRight size={16} />
                    </button>
                  ))}
                </div>
              </div>
            )}
          {!departmentId && executiveDepartment && (
            <div className="org-trunk" aria-hidden="true" />
          )}
          <div className="org-branches">
            {branchDepartments
              ?.filter((item) => !departmentId || item.id === departmentId)
              .map((department) => {
                const presentation = departmentPresentation(department.name);
                const people = visible.filter(
                  (person) => person.departmentId === department.id,
                );
                return (
                  <section
                    className={`department-panel department-${presentation.color}`}
                    key={department.id}
                    aria-labelledby={`${department.id}-title`}
                  >
                    <div className="department-header">
                      <div>
                        <span>{presentation.short}</span>
                        <h2 id={`${department.id}-title`}>{department.name}</h2>
                      </div>
                      <span className="department-count">
                        {people.length} 人
                      </span>
                    </div>
                    <p className="department-description">
                      {presentation.description}
                    </p>
                    <div className="department-members">
                      {people.length ? (
                        people.map((person, personIndex) => (
                          <button
                            type="button"
                            className={
                              person.role === "ADMIN" || personIndex === 0
                                ? "person-row is-head"
                                : "person-row"
                            }
                            onClick={() => setSelected(person)}
                            key={person.id}
                          >
                            <Avatar person={person} />
                            <span className="person-copy">
                              <strong>{person.displayName}</strong>
                              <small>{person.title}</small>
                            </span>
                            {(person.role === "ADMIN" || personIndex === 0) && (
                              <em>HEAD · 负责人</em>
                            )}
                            <ChevronRight size={16} />
                          </button>
                        ))
                      ) : (
                        <div className="organization-empty">
                          <CircleUserRound size={19} />
                          <span>没有匹配到这组同事</span>
                        </div>
                      )}
                    </div>
                  </section>
                );
              })}
          </div>
        </section>
        <section
          className="organization-principles section-wrap"
          aria-label="协作原则"
        >
          <div>
            <Sparkles size={18} />
            <strong>先找负责人</strong>
            <p>遇到跨部门问题，先从负责人的名片开始，知道谁可以给你方向。</p>
          </div>
          <div>
            <Users size={18} />
            <strong>再找协作者</strong>
            <p>知道一件事由谁负责，也知道下一步应该和谁一起完成。</p>
          </div>
          <div>
            <BriefcaseBusiness size={18} />
            <strong>最后找资料</strong>
            <p>把一次沟通沉淀成团队可复用的知识，而不是只停在聊天里。</p>
          </div>
        </section>
      </main>
      <footer className="organization-page-footer">
        <Brand className="footer-brand" />
        <p>组织与协作 · 找到同行者</p>
        <span>© 2026 Yishan Technology</span>
      </footer>
      {selected && (
        <ProfileModal person={selected} close={() => setSelected(null)} />
      )}
    </div>
  );
}
