import { useEffect, type ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { AccountMenu } from "../components/AccountMenu";
import { Brand } from "../components/Brand";

export function AssessmentLayout({
  children,
  compact = false,
  reportCanvas = false,
}: {
  children: ReactNode;
  compact?: boolean;
  reportCanvas?: boolean;
}) {
  useEffect(() => {
    if (!reportCanvas) return;
    document.body.classList.add("assessment-report-canvas");
    return () => document.body.classList.remove("assessment-report-canvas");
  }, [reportCanvas]);

  const className = [
    "assessment-shell",
    compact ? "is-compact" : "",
    reportCanvas ? "is-report-canvas" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={className}>
      <header className="assessment-topbar">
        <Brand href="/" ariaLabel="返回 Orosaga 山海经首页" />
        <a className="assessment-back" href="/assessment/geo-foundations">
          <ArrowLeft size={15} aria-hidden="true" /> 测评首页
        </a>
        <AccountMenu />
      </header>
      {children}
    </div>
  );
}

export function AssessmentPageState({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <AssessmentLayout>
      <main className="assessment-state">
        <span className="eyebrow">GEO Foundations</span>
        <h1>{title}</h1>
        <p>{message}</p>
        {action}
      </main>
    </AssessmentLayout>
  );
}
