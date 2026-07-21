import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ChevronRight, Search, X } from "lucide-react";
import type { Department, Employee } from "@orosaga/contracts";
import { api } from "./lib/api";

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
      (members.data ?? []).filter((person) => {
        const words =
          `${person.displayName}${person.title}${person.departmentName}${person.tags.join("")}`.toLowerCase();
        return (
          (!departmentId || person.departmentId === departmentId) &&
          (!query.trim() || words.includes(query.trim().toLowerCase()))
        );
      }),
    [departmentId, members.data, query],
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
        <a className="brand" href="/">
          <img src="/favicon.svg" alt="" />
          <span className="brand-copy">
            <strong>Orosaga</strong>
            <small>山海经</small>
          </span>
        </a>
        <span className="organization-page-location">组织与协作</span>
        <a className="organization-back" href="/">
          <ArrowLeft size={16} /> 返回知识地图
        </a>
      </header>
      <main className="organization-page">
        <div className="organization-intro section-wrap">
          <div>
            <span className="eyebrow">People & collaboration · 组织与协作</span>
            <h1>找到一起把事情做好的人</h1>
            <p>
              姓名、部门和在职状态由飞书同步；简介与协作标签由门户持续维护。
            </p>
          </div>
          <div className="organization-intro-note">
            <strong>{members.data?.length ?? 0} 位同事</strong>
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
            {departments.data?.map((item) => (
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
          <span className="organization-result-count">
            找到 {visible.length} 位同事
          </span>
        </section>
        <section className="org-chart section-wrap" aria-label="组织成员">
          <div className="org-branches">
            {departments.data
              ?.filter((item) => !departmentId || item.id === departmentId)
              .map((department) => {
                const people = visible.filter(
                  (person) => person.departmentId === department.id,
                );
                return (
                  <section
                    className="department-panel department-blue"
                    key={department.id}
                  >
                    <div className="department-header">
                      <div>
                        <span>Department</span>
                        <h2>{department.name}</h2>
                      </div>
                      <span className="department-count">
                        {people.length} 人
                      </span>
                    </div>
                    <div className="department-members">
                      {people.length ? (
                        people.map((person) => (
                          <button
                            className="person-row"
                            onClick={() => setSelected(person)}
                            key={person.id}
                          >
                            <Avatar person={person} />
                            <span className="person-copy">
                              <strong>{person.displayName}</strong>
                              <small>{person.title}</small>
                            </span>
                            <ChevronRight size={16} />
                          </button>
                        ))
                      ) : (
                        <div className="organization-empty">
                          没有匹配到这组同事
                        </div>
                      )}
                    </div>
                  </section>
                );
              })}
          </div>
        </section>
      </main>
      <footer className="organization-page-footer">
        <a className="brand footer-brand" href="/">
          <img src="/favicon.svg" alt="" />
          <span className="brand-copy">
            <strong>Orosaga</strong>
            <small>山海经</small>
          </span>
        </a>
        <p>组织与协作 · 找到同行者</p>
        <span>© 2026 Yishan Technology</span>
      </footer>
      {selected && (
        <ProfileModal person={selected} close={() => setSelected(null)} />
      )}
    </div>
  );
}
