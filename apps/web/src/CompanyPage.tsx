import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  Bot,
  BrainCircuit,
  Building2,
  Check,
  ChevronDown,
  CircleDot,
  FileSearch,
  Gauge,
  Globe2,
  Layers3,
  Network,
  RefreshCw,
  SearchCheck,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import {
  companyContentPayloadSchema,
  type CompanyContentPayload,
  type ContentPage,
} from "@orosaga/contracts";
import { Brand, BrandMark } from "./components/Brand";
import { AccountMenu } from "./components/AccountMenu";
import { api } from "./lib/api";

const journeyIcons = [SearchCheck, BrainCircuit, Target];
const solutionIcons = [FileSearch, Network, BarChart3];
const deliveryIcons = [
  FileSearch,
  Target,
  Layers3,
  Gauge,
  SearchCheck,
  RefreshCw,
];
const customerIcons = [Building2, Globe2, Gauge, ShieldCheck];

function Heading({
  data,
  id,
}: {
  data: CompanyContentPayload["whyGeo"]["heading"];
  id?: string;
}) {
  return (
    <div className="company-section-heading">
      <span>{data.kicker}</span>
      <h2 id={id}>{data.title}</h2>
      {data.description && <p>{data.description}</p>}
    </div>
  );
}

export default function CompanyPage() {
  const page = useQuery({
    queryKey: ["page", "company"],
    queryFn: () => api<ContentPage>("/api/v1/pages/company"),
  });
  const [activeStep, setActiveStep] = useState(0);
  const [systemsOpen, setSystemsOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(0);
  if (page.isPending)
    return <main className="route-state">正在读取公司资料…</main>;
  if (page.isError)
    return (
      <main className="route-state">
        <h1>公司资料加载失败</h1>
        <button onClick={() => void page.refetch()}>重试</button>
      </main>
    );
  const parsed = companyContentPayloadSchema.safeParse(page.data.content);
  if (!parsed.success)
    return (
      <main className="route-state">
        <h1>公司资料正在升级</h1>
        <p>专用结构化内容尚未发布，请稍后刷新。</p>
      </main>
    );
  const content = parsed.data;
  const currentStep =
    content.delivery.steps[activeStep] ?? content.delivery.steps[0];
  const StepIcon = deliveryIcons[activeStep] ?? FileSearch;

  return (
    <div className="site-shell company-page-shell">
      <header className="topbar company-topbar">
        <Brand />
        <span className="company-page-location">公司与业务</span>
        <div className="topbar-account-actions">
          <a className="company-back" href="/">
            <ArrowLeft size={16} /> 返回知识地图
          </a>
          <AccountMenu />
        </div>
      </header>
      <main className="company-page">
        <div className="company-layout section-wrap">
          <aside className="company-sidebar" aria-label="公司与业务目录">
            <div className="company-sidebar-title">
              <span>Newcomer guide</span>
              <strong>新人阅读路线</strong>
            </div>
            <nav>
              <a href="#overview">
                <span>01</span>公司是什么
              </a>
              <a href="#why-geo">
                <span>02</span>为什么做 GEO
              </a>
              <a href="#solution">
                <span>03</span>我们怎样解决
              </a>
              <a href="#delivery">
                <span>04</span>业务如何运转
              </a>
              <a href="#customers">
                <span>05</span>服务谁
              </a>
              <a href="#proof">
                <span>06</span>结果与边界
              </a>
              <a href="#remember">
                <span>07</span>新人必记
              </a>
            </nav>
            <div className="company-source-note">
              <BookOpenCheck size={15} />
              <span>
                {content.source.label}
                <br />
                <strong>{content.source.name}</strong>
                <br />
                {content.source.date}
              </span>
            </div>
          </aside>
          <article className="company-article">
            <section className="company-intro" id="overview">
              <span className="eyebrow">{content.eyebrow}</span>
              <h1>{content.title}</h1>
              <p className="company-lead">{content.lead}</p>
              <div className="company-definition">
                <div className="company-definition-mark">
                  <BrandMark alt="移山科技山海标识" />
                  <span>{content.definition.label}</span>
                </div>
                <div>
                  <strong>{content.definition.title}</strong>
                  <p>{content.definition.description}</p>
                </div>
              </div>
              <dl className="company-facts">
                {content.facts.map((fact) => (
                  <div key={fact.label}>
                    <dt>{fact.label}</dt>
                    <dd>{fact.value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className="company-section" id="why-geo">
              <Heading data={content.whyGeo.heading} />
              <div className="behavior-shift" aria-label="用户获取信息方式变化">
                {content.whyGeo.journey
                  .map((item, index) => {
                    const Icon = journeyIcons[index] ?? Target;
                    return (
                      <div
                        className={index === 2 ? "behavior-question" : ""}
                        key={item.title}
                      >
                        <span>{item.subtitle}</span>
                        <Icon size={22} />
                        <strong>{item.title}</strong>
                        <p>{item.description}</p>
                      </div>
                    );
                  })
                  .flatMap((item, index) =>
                    index
                      ? [<ArrowRight size={20} key={`arrow-${index}`} />, item]
                      : [item],
                  )}
              </div>
              <div className="geo-definition">
                <span>GEO 的核心</span>
                <p>{content.whyGeo.definition}</p>
              </div>
            </section>

            <section className="company-section" id="solution">
              <Heading data={content.solution.heading} />
              <div className="solution-layers">
                {content.solution.layers.map((item, index) => {
                  const Icon = solutionIcons[index] ?? Network;
                  return (
                    <div key={item.title}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <Icon size={21} />
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                    </div>
                  );
                })}
              </div>
              <div className="two-wheel-system">
                {content.solution.wheels.map((item, index) => {
                  const Icon = index === 0 ? Bot : Users;
                  return (
                    <div key={item.title}>
                      <span
                        className={
                          index === 0 ? "wheel-icon" : "wheel-icon operations"
                        }
                      >
                        <Icon size={22} />
                      </span>
                      <div>
                        <small>{item.subtitle}</small>
                        <strong>{item.title}</strong>
                        <p>{item.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
              <button
                className="systems-disclosure"
                type="button"
                aria-expanded={systemsOpen}
                onClick={() => setSystemsOpen((current) => !current)}
              >
                <span>
                  <Sparkles size={16} /> {content.solution.systems.length} 大
                  GEO 数字化系统分别做什么？
                </span>
                <ChevronDown size={18} />
              </button>
              {systemsOpen && (
                <div className="systems-list">
                  {content.solution.systems.map((item, index) => (
                    <div key={item.title}>
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <strong>{item.title}</strong>
                      <p>{item.description}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <section className="company-section" id="delivery">
              <Heading data={content.delivery.heading} />
              <div
                className="delivery-tabs"
                role="tablist"
                aria-label="GEO 标准交付路径"
              >
                {content.delivery.steps.map((step, index) => {
                  const Icon = deliveryIcons[index] ?? FileSearch;
                  return (
                    <button
                      type="button"
                      role="tab"
                      aria-selected={activeStep === index}
                      onClick={() => setActiveStep(index)}
                      className={activeStep === index ? "is-active" : ""}
                      key={step.title}
                    >
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <Icon size={17} />
                      <strong>{step.title}</strong>
                    </button>
                  );
                })}
              </div>
              <div
                className="delivery-detail"
                role="tabpanel"
                key={currentStep.title}
              >
                <span className="delivery-detail-icon">
                  <StepIcon size={25} />
                </span>
                <div>
                  <small>{currentStep.subtitle}</small>
                  <h3>{currentStep.title}</h3>
                  <p>{currentStep.description}</p>
                </div>
                <div className="delivery-output">
                  <span>这一阶段留下什么</span>
                  <strong>{currentStep.output}</strong>
                </div>
              </div>
              <div className="metric-language">
                <span>我们用三类结果说话</span>
                {content.delivery.metrics.map((metric) => (
                  <div key={metric.title}>
                    <strong>{metric.title}</strong>
                    <p>{metric.description}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="company-section" id="customers">
              <Heading data={content.customers.heading} />
              <div className="customer-fit">
                {content.customers.fit.map((item, index) => {
                  const Icon = customerIcons[index] ?? Building2;
                  return (
                    <div key={item.title}>
                      <Icon size={19} />
                      <strong>{item.title}</strong>
                      <p>{item.description}</p>
                    </div>
                  );
                })}
              </div>
              <div className="service-modes">
                {content.customers.modes.map((item) => (
                  <div key={item.title}>
                    <span>{item.subtitle}</span>
                    <h3>{item.title}</h3>
                    <strong>{item.value}</strong>
                    <p>{item.description}</p>
                  </div>
                ))}
              </div>
              <div className="raas-note">
                <CircleDot size={17} />
                <p>
                  <strong>{content.customers.note.split("｜")[0]}</strong>
                  {content.customers.note.split("｜")[1]}
                </p>
              </div>
            </section>

            <section className="company-section" id="proof">
              <Heading data={content.proof.heading} />
              <div className="proof-stats">
                {content.proof.stats.map((stat) => (
                  <div key={stat.label}>
                    <span>{stat.label}</span>
                    <strong>{stat.value}</strong>
                  </div>
                ))}
              </div>
              <div className="case-studies">
                {content.proof.cases.map((item) => (
                  <article key={item.title}>
                    <span>{item.meta}</span>
                    <strong>{item.title}</strong>
                    <p>{item.description}</p>
                  </article>
                ))}
              </div>
              <p className="proof-disclaimer">{content.proof.disclaimer}</p>
              <div className="boundary-grid">
                {content.proof.boundaries.map((item, index) => (
                  <div key={item.title}>
                    <span>
                      {index === 0 ? (
                        <Check size={17} />
                      ) : (
                        <ShieldCheck size={17} />
                      )}
                      {item.title}
                    </span>
                    <p>{item.description}</p>
                  </div>
                ))}
              </div>
              <div className="company-milestones">
                <span>行业建设</span>
                {content.proof.milestones.map((item) => (
                  <div key={item.label}>
                    <strong>{item.label}</strong>
                    <p>{item.value}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="company-section company-remember" id="remember">
              <Heading data={content.remember.heading} />
              <ol>
                {content.remember.facts.map((fact, index) => (
                  <li key={fact}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    <p>{fact}</p>
                  </li>
                ))}
              </ol>
            </section>

            <section
              className="company-section company-faq"
              aria-labelledby="company-faq-title"
            >
              <Heading data={content.faq.heading} id="company-faq-title" />
              <div className="company-faq-list">
                {content.faq.items.map((faq, index) => (
                  <div
                    className={openFaq === index ? "is-open" : ""}
                    key={faq.question}
                  >
                    <button
                      type="button"
                      aria-expanded={openFaq === index}
                      onClick={() => setOpenFaq(openFaq === index ? -1 : index)}
                    >
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      <strong>{faq.question}</strong>
                      <ChevronDown size={18} />
                    </button>
                    {openFaq === index && <p>{faq.answer}</p>}
                  </div>
                ))}
              </div>
            </section>
          </article>
        </div>
      </main>
      <footer className="company-page-footer">
        <Brand className="footer-brand" />
        <p>公司与业务 · 新人阅读手册</p>
        <span>© 2026 Yishan Technology</span>
      </footer>
    </div>
  );
}
