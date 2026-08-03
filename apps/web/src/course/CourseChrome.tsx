import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { AccountMenu } from "../components/AccountMenu";
import { Brand } from "../components/Brand";

export function CourseChrome({
  backHref = "/",
  backLabel = "返回知识地图",
  children,
}: {
  backHref?: string;
  backLabel?: string;
  children: ReactNode;
}) {
  return (
    <div className="course-site">
      <header className="course-topbar">
        <div className="course-topbar-left">
          <Brand />
          <span className="course-topbar-separator" aria-hidden="true" />
          <a className="course-back-link" href={backHref}>
            <ArrowLeft size={16} aria-hidden="true" />
            {backLabel}
          </a>
        </div>
        <AccountMenu />
      </header>
      {children}
    </div>
  );
}

export function CoursePageState({
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: ReactNode;
}) {
  return (
    <main className="course-page-state">
      <span className="course-state-mark" aria-hidden="true">
        山
      </span>
      <h1>{title}</h1>
      <p>{detail}</p>
      {action}
    </main>
  );
}
