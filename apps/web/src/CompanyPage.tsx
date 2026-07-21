import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import type { ContentPage } from "@orosaga/contracts";
import { ContentBlocks } from "./components/ContentBlocks";
import { api } from "./lib/api";

export default function CompanyPage() {
  const page = useQuery({
    queryKey: ["page", "company"],
    queryFn: () => api<ContentPage>("/api/v1/pages/company"),
  });
  if (page.isPending)
    return <main className="route-state">正在读取公司资料…</main>;
  if (page.isError)
    return (
      <main className="route-state">
        <h1>公司资料加载失败</h1>
        <button onClick={() => void page.refetch()}>重试</button>
      </main>
    );
  return (
    <div className="site-shell company-page-shell">
      <header className="topbar company-topbar">
        <a className="brand" href="/">
          <img src="/favicon.svg" alt="" />
          <span className="brand-copy">
            <strong>Orosaga</strong>
            <small>山海经</small>
          </span>
        </a>
        <span>公司与业务</span>
        <a href="/">
          <ArrowLeft size={16} /> 返回知识地图
        </a>
      </header>
      <main className="company-page">
        <section className="company-hero">
          <div className="section-wrap">
            <span className="eyebrow">
              {page.data.content.eyebrow ?? "About Yishan"}
            </span>
            <h1>{page.data.content.title}</h1>
            <p>{page.data.content.summary}</p>
            <small className="company-version">
              版本 {page.data.version} ·{" "}
              {new Date(page.data.updatedAt).toLocaleString("zh-CN")}
            </small>
          </div>
        </section>
        <div className="section-wrap content-blocks">
          <ContentBlocks content={page.data.content} />
        </div>
      </main>
      <footer>
        <a className="brand footer-brand" href="/">
          <img src="/favicon.svg" alt="" />
          <span className="brand-copy">
            <strong>Orosaga</strong>
            <small>山海经</small>
          </span>
        </a>
        <p>公司与业务 · 持续更新</p>
        <span>© 2026 Yishan Technology</span>
      </footer>
    </div>
  );
}
