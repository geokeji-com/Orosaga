import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { ContentPage } from "@orosaga/contracts";
import { api } from "./lib/api";
import { Brand, BrandMark } from "./components/Brand";
import {
  ArrowRight,
  BookOpenText,
  Boxes,
  Building2,
  CalendarDays,
  ChevronRight,
  CircleHelp,
  CloudSun,
  Compass,
  FileText,
  GraduationCap,
  Menu,
  Network,
  Search,
  Sparkles,
  Workflow,
  X,
} from "lucide-react";

type AtlasItem = {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  meta: string;
  icon: typeof Building2;
  tint: "mint" | "blue" | "rose" | "ink" | "amber" | "violet";
};

const atlasItems: AtlasItem[] = [
  {
    id: "company",
    eyebrow: "先认识我们",
    title: "公司与业务",
    description: "从移山科技为什么存在开始，了解品牌、客户与核心业务。",
    meta: "8 篇核心阅读",
    icon: Building2,
    tint: "mint",
  },
  {
    id: "organization",
    eyebrow: "找到同行者",
    title: "组织与协作",
    description: "团队分工、协作边界和关键角色，一张图找到应该和谁聊。",
    meta: "组织图 · 通讯录",
    icon: Network,
    tint: "blue",
  },
  {
    id: "systems",
    eyebrow: "工具不迷路",
    title: "系统地图",
    description: "把内部系统按场景串起来：在哪里看、在哪里做、在哪里沉淀。",
    meta: "7 个系统入口",
    icon: Boxes,
    tint: "violet",
  },
  {
    id: "workflow",
    eyebrow: "把事情做成",
    title: "运营工作流",
    description: "从需求进入到交付复盘，理解运营同学每日工作的真实路径。",
    meta: "6 条标准流程",
    icon: Workflow,
    tint: "rose",
  },
  {
    id: "village",
    eyebrow: "第一次登山",
    title: "新手村",
    description: "按入职天数推进的学习路线、任务清单与必读文档。",
    meta: "建议从这里开始",
    icon: GraduationCap,
    tint: "amber",
  },
  {
    id: "voices",
    eyebrow: "路书与手记",
    title: "同事分享",
    description: "项目复盘、研究笔记和那些值得被更多人看见的方法。",
    meta: "每周持续更新",
    icon: BookOpenText,
    tint: "ink",
  },
];

type SearchResult = {
  id: string;
  type: string;
  title: string;
  description: string;
  href: string;
};

const updates = [
  {
    date: "07.12",
    type: "研究",
    title: "AI 搜索正在如何改变品牌内容的组织方式",
  },
  {
    date: "07.09",
    type: "复盘",
    title: "从一次项目交付看清高质量协作的四个节点",
  },
  { date: "07.05", type: "手记", title: "新同事的第一个月：问题比答案更重要" },
];

const mountainMilestones = [
  { title: "寻山者", detail: "认识公司、方向与身边的同行者" },
  {
    title: "攀登者",
    detail: "掌握系统，也完成第一次真实交付",
    target: "journey",
  },
  {
    title: "同行者",
    detail: "在协作中找到位置，也彼此成就",
    target: "atlas",
    scrollOffset: 190,
  },
  {
    title: "布道者",
    detail: "把经验讲清楚，让方法被更多人使用",
    target: "latest",
  },
  {
    title: "登峰者",
    detail: "独立负责，也带后来者继续向前",
    target: "closing",
  },
];

const mountainFortunes = [
  { level: "大吉", message: "今日所行皆有回响，适合把重要的一步走出去。" },
  { level: "吉", message: "同行有光，稳稳向前就会遇见新的好消息。" },
  { level: "小吉", message: "一件小事会顺利落定，也会成为下一段路的起点。" },
];

function describeWeather(code: number) {
  if (code <= 1) return "晴朗开阔";
  if (code <= 3) return "云开有光";
  if (code <= 48) return "雾气轻柔";
  if (code <= 67) return "小雨润山";
  if (code <= 77) return "瑞雪清新";
  if (code <= 82) return "阵雨洗尘";
  return "天色有景";
}

function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeResult, setActiveResult] = useState(0);
  const [activeMilestone, setActiveMilestone] = useState(0);
  const [fortune, setFortune] = useState<
    (typeof mountainFortunes)[number] | null
  >(null);
  const [weather, setWeather] = useState({
    temperature: "",
    condition: "天气正好",
  });
  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchOpenerRef = useRef<HTMLElement | null>(null);
  const homePage = useQuery({
    queryKey: ["page", "home"],
    queryFn: () => api<ContentPage>("/api/v1/pages/home"),
  });
  const search = useQuery({
    queryKey: ["search", query.trim()],
    queryFn: () =>
      api<{ items: SearchResult[]; nextCursor: null }>(
        `/api/v1/search?q=${encodeURIComponent(query.trim())}`,
      ),
    enabled: searchOpen && query.trim().length > 0,
  });
  const filteredEntries = search.data?.items ?? [];

  const today = useMemo(
    () =>
      new Intl.DateTimeFormat("zh-CN", {
        year: "numeric",
        month: "long",
        day: "numeric",
        weekday: "long",
      }).format(new Date()),
    [],
  );

  const openSearch = useCallback(() => {
    searchOpenerRef.current = document.activeElement as HTMLElement;
    setActiveResult(0);
    setSearchOpen(true);
  }, []);
  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setQuery("");
    window.setTimeout(() => searchOpenerRef.current?.focus(), 0);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openSearch();
      }
      if (event.key === "Escape") {
        closeSearch();
        setMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeSearch, openSearch]);

  useEffect(() => {
    if (searchOpen)
      window.setTimeout(() => searchInputRef.current?.focus(), 40);
  }, [searchOpen]);

  useEffect(() => {
    api<{
      current?: { temperature_2m?: number; weather_code?: number };
      available?: boolean;
    }>("/api/v1/widgets/weather")
      .then((data) => {
        const temperature = Number(data.current?.temperature_2m);
        const code = Number(data.current?.weather_code ?? 0);
        setWeather({
          temperature: Number.isFinite(temperature)
            ? `${Math.round(temperature)}°`
            : "",
          condition: describeWeather(code),
        });
      })
      .catch(() => setWeather({ temperature: "", condition: "天气正好" }));
  }, []);

  const drawFortune = () => {
    const next =
      mountainFortunes[Math.floor(Math.random() * mountainFortunes.length)];
    setFortune(next);
  };

  const selectMilestone = (index: number) => {
    const milestone = mountainMilestones[index];
    setActiveMilestone(index);

    if (!milestone.target) return;

    const target = document.getElementById(milestone.target);
    if (!target) return;

    const scrollMargin =
      Number.parseFloat(window.getComputedStyle(target).scrollMarginTop) || 0;
    const targetTop = target.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({
      top: targetTop - scrollMargin + (milestone.scrollOffset ?? 0),
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    });
  };

  const closeAndNavigate = () => {
    closeSearch();
    setMenuOpen(false);
    setQuery("");
  };
  const homeContent = homePage.data?.content;
  const homeTitle =
    homeContent && "summary" in homeContent
      ? homeContent.title
      : "Orosaga 山海经";
  const homeSummary =
    homeContent && "summary" in homeContent
      ? homeContent.summary
      : "一张持续生长的公司知识地图。认识我们为何出发，也找到你接下来要走的路。";

  return (
    <div className="site-shell">
      <header className="topbar">
        <Brand href="#top" ariaLabel="Orosaga 山海经首页" />

        <nav
          className={menuOpen ? "main-nav is-open" : "main-nav"}
          aria-label="主导航"
        >
          <a href="#atlas" onClick={() => setMenuOpen(false)}>
            知识地图
          </a>
          <a href="#journey" onClick={() => setMenuOpen(false)}>
            新手村
          </a>
          <a href="/workflow" onClick={() => setMenuOpen(false)}>
            工作流
          </a>
          <a href="/voices" onClick={() => setMenuOpen(false)}>
            研究与分享
          </a>
        </nav>

        <div className="header-actions">
          <button
            className="search-trigger"
            type="button"
            aria-label="搜索山海经"
            onClick={openSearch}
          >
            <Search size={16} strokeWidth={1.8} />
            <span>搜索山海经</span>
            <kbd>⌘ K</kbd>
          </button>
          <button
            className="icon-button menu-button"
            type="button"
            aria-label={menuOpen ? "关闭菜单" : "打开菜单"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((current) => !current)}
          >
            {menuOpen ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </header>

      <main id="top">
        <section className="hero" aria-labelledby="hero-title">
          <div className="shanshui-scene" aria-hidden="true">
            <div className="paper-sun" />
            <div className="mist-band mist-band-one" />
            <div className="mist-band mist-band-two" />
            <div className="ridge ridge-far" />
            <div className="ridge ridge-mid" />
            <div className="ridge ridge-near" />
          </div>
          <div className="hero-inner">
            <div className="hero-copy">
              <div className="hero-kicker">
                <Compass size={15} /> 移山科技内部知识站
              </div>
              <h1 id="hero-title">
                <span>{homeTitle.split(" ")[0]}</span>
                {homeTitle.split(" ").slice(1).join(" ")}
              </h1>
              <p>{homeSummary}</p>
              <div className="hero-actions">
                <a className="primary-button" href="#journey">
                  开始新手旅程 <ArrowRight size={17} />
                </a>
                <a className="text-link" href="#atlas">
                  浏览知识地图 <ChevronRight size={16} />
                </a>
              </div>
            </div>

            <aside className="hero-wayfinder" aria-label="今日登山指南">
              <div className="hero-today-meta">
                <span>
                  <CalendarDays size={13} />
                  {today}
                </span>
                <span>
                  <CloudSun size={14} />
                  西安 · {weather.temperature}
                  {weather.condition}
                </span>
              </div>

              <div className="hero-coordinate">
                <div>
                  <span>今日坐标</span>
                  <strong>{mountainMilestones[activeMilestone].title}</strong>
                  <p>{mountainMilestones[activeMilestone].detail}</p>
                </div>
                <button
                  type="button"
                  className="fortune-draw"
                  onClick={drawFortune}
                >
                  <Sparkles size={15} /> 抽今日山签
                </button>
              </div>

              <div
                className={
                  fortune ? "fortune-result has-result" : "fortune-result"
                }
                aria-live="polite"
              >
                <span>今日山签</span>
                {fortune ? (
                  <div key={`${fortune.level}-${fortune.message}`}>
                    <strong>{fortune.level}</strong>
                    <p>{fortune.message}</p>
                  </div>
                ) : (
                  <p>轻触抽签，带一句好话出发。</p>
                )}
              </div>

              <ol className="mountain-route" aria-label="成长路线">
                {mountainMilestones.map((milestone, index) => (
                  <li
                    className={index === activeMilestone ? "is-active" : ""}
                    key={milestone.title}
                  >
                    {milestone.target ? (
                      <button
                        type="button"
                        aria-pressed={index === activeMilestone}
                        onClick={() => selectMilestone(index)}
                      >
                        <span className="route-node">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <strong>{milestone.title}</strong>
                        <small>{milestone.detail}</small>
                      </button>
                    ) : (
                      <span className="mountain-route-current">
                        <span className="route-node">
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <strong>{milestone.title}</strong>
                        <small>{milestone.detail}</small>
                      </span>
                    )}
                  </li>
                ))}
              </ol>
            </aside>
          </div>
          <a className="hero-next" href="#atlas" aria-label="前往知识地图">
            <span>向下探索</span>
            <i />
          </a>
        </section>

        <section
          className="atlas section-wrap"
          id="atlas"
          aria-labelledby="atlas-title"
        >
          <div className="section-heading split-heading">
            <div>
              <span className="eyebrow">Knowledge atlas · 知识地图</span>
              <h2 id="atlas-title">先看见全貌，再选择一条路</h2>
            </div>
            <p>
              我们把散落在不同系统、文档和同事经验里的知识，重新整理成六座可以探索的山。
            </p>
          </div>

          <div className="atlas-grid">
            {atlasItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <a
                  className={`atlas-card card-${index + 1} tint-${item.tint}`}
                  id={item.id}
                  href={
                    item.id === "company"
                      ? "/company"
                      : item.id === "organization"
                        ? "/organization"
                        : item.id === "systems"
                          ? "/systems"
                          : item.id === "village"
                            ? "#journey"
                            : item.id === "workflow"
                              ? "/workflow"
                              : item.id === "voices"
                                ? "/voices"
                                : "#latest"
                  }
                  key={item.id}
                >
                  <div className="atlas-card-top">
                    <span className="atlas-icon">
                      <Icon size={21} strokeWidth={1.7} />
                    </span>
                    <span className="card-arrow">
                      <ArrowRight size={18} />
                    </span>
                  </div>
                  <div>
                    <span className="card-eyebrow">{item.eyebrow}</span>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>
                  <span className="card-meta">{item.meta}</span>
                </a>
              );
            })}
          </div>
        </section>

        <section
          className="journey-band"
          id="journey"
          aria-labelledby="journey-title"
        >
          <div className="section-wrap journey-inner">
            <div className="journey-intro">
              <span className="eyebrow">Newcomer trail · 新手村</span>
              <h2 id="journey-title">不用一次读完一座山</h2>
              <p>按真实工作节奏分成四段。每一段只回答当下最重要的问题。</p>
              <a className="primary-button compact" href="#latest">
                查看完整路线 <ArrowRight size={16} />
              </a>
            </div>

            <ol className="trail">
              <li>
                <span className="trail-number">01</span>
                <div className="trail-copy">
                  <small>Day 1</small>
                  <strong>先安顿下来</strong>
                  <p>认识公司、团队与协作工具</p>
                </div>
                <a
                  className="trail-action"
                  href="/company"
                  aria-label="进入公司与业务页面"
                >
                  <ChevronRight size={19} />
                </a>
              </li>
              <li>
                <span className="trail-number">02</span>
                <div className="trail-copy">
                  <small>Week 1</small>
                  <strong>读懂业务地图</strong>
                  <p>理解客户、产品和核心流程</p>
                </div>
                <a
                  className="trail-action"
                  href="/workflow"
                  aria-label="进入运营工作流页面"
                >
                  <ChevronRight size={19} />
                </a>
              </li>
              <li>
                <span className="trail-number">03</span>
                <div className="trail-copy">
                  <small>Week 2</small>
                  <strong>完成第一次同行</strong>
                  <p>跟随标准工作流参与交付</p>
                </div>
                <a
                  className="trail-action"
                  href="/systems"
                  aria-label="从安全系统地图进入运营提交模块"
                >
                  <ChevronRight size={19} />
                </a>
              </li>
              <li>
                <span className="trail-number">04</span>
                <div className="trail-copy">
                  <small>Month 1</small>
                  <strong>留下你的路书</strong>
                  <p>复盘、分享并更新知识地图</p>
                </div>
                <a
                  className="trail-action"
                  href="/camps"
                  aria-label="进入知识营地"
                >
                  <ChevronRight size={19} />
                </a>
              </li>
            </ol>
          </div>
        </section>

        <section className="latest" id="latest" aria-labelledby="latest-title">
          <div className="section-wrap latest-inner">
            <div className="section-heading split-heading">
              <div>
                <span className="eyebrow">Latest field notes · 最新路书</span>
                <h2 id="latest-title">研究、复盘与同事分享</h2>
              </div>
              <a className="text-link dark" href="/voices">
                查看全部内容 <ChevronRight size={16} />
              </a>
            </div>
            <div className="update-list">
              {updates.map((update) => (
                <a href="#top" key={update.title}>
                  <time>{update.date}</time>
                  <span>{update.type}</span>
                  <strong>{update.title}</strong>
                  <ArrowRight size={18} />
                </a>
              ))}
            </div>
          </div>
        </section>

        <section
          className="closing section-wrap"
          id="closing"
          aria-label="共建知识库"
        >
          <BrandMark alt="Orosaga 山海标识" />
          <div>
            <span className="eyebrow">A living map · 一张活地图</span>
            <h2>每一份经验，都可以成为后来者的路标。</h2>
          </div>
          <a className="primary-button" href="mailto:knowledge@yishan.tech">
            分享你的路书 <ArrowRight size={17} />
          </a>
        </section>
      </main>

      <footer>
        <Brand className="footer-brand" href="#top" />
        <p>移山科技共同知识库 · 持续生长中</p>
        <span>© 2026 Yishan Technology</span>
      </footer>

      {searchOpen && (
        <div
          className="search-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeSearch();
          }}
        >
          <div
            className="search-dialog"
            role="dialog"
            aria-modal="true"
            aria-label="搜索山海经"
          >
            <div className="search-field">
              <Search size={21} />
              <input
                ref={searchInputRef}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    setActiveResult((value) =>
                      Math.min(value + 1, filteredEntries.length - 1),
                    );
                  }
                  if (event.key === "ArrowUp") {
                    event.preventDefault();
                    setActiveResult((value) => Math.max(value - 1, 0));
                  }
                  if (event.key === "Enter" && filteredEntries[activeResult])
                    window.location.assign(filteredEntries[activeResult].href);
                }}
                placeholder="搜索业务、系统、流程或一位同事的分享"
                aria-label="搜索关键词"
              />
              <button
                type="button"
                className="icon-button"
                aria-label="关闭搜索"
                onClick={closeSearch}
              >
                <X size={19} />
              </button>
            </div>
            <div className="search-results">
              <span className="search-caption">
                {query ? `与“${query}”相关` : "输入关键词开始搜索"}
              </span>
              {search.isFetching ? (
                <div className="empty-state">
                  <p>正在寻找…</p>
                </div>
              ) : filteredEntries.length > 0 ? (
                filteredEntries.map((entry, index) => (
                  <a
                    href={entry.href}
                    className={index === activeResult ? "is-active" : ""}
                    key={`${entry.type}-${entry.id}`}
                    onMouseEnter={() => setActiveResult(index)}
                    onClick={closeAndNavigate}
                  >
                    <span className="result-icon">
                      <FileText size={17} />
                    </span>
                    <div>
                      <small>{entry.type}</small>
                      <strong>{entry.title}</strong>
                      <p>{entry.description}</p>
                    </div>
                    <ChevronRight size={17} />
                  </a>
                ))
              ) : (
                <div className="empty-state">
                  <CircleHelp size={22} />
                  <strong>暂时没找到这条路</strong>
                  <p>换一个更短的关键词试试。</p>
                </div>
              )}
            </div>
            <div className="search-footer">
              <span>↑ ↓ 浏览</span>
              <span>↵ 打开</span>
              <span>esc 关闭</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default HomePage;
