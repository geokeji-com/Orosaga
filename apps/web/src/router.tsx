import { lazy, Suspense } from "react";
import type { ReactNode } from "react";
import { createBrowserRouter } from "react-router-dom";
import { AdminGate, AssessmentAdminGate, AuthGate } from "./auth/AuthGate";

const HomePage = lazy(() => import("./HomePage"));
const CompanyPage = lazy(() => import("./CompanyPage"));
const OrganizationPage = lazy(() => import("./OrganizationPage"));
const SystemsPage = lazy(() => import("./SystemsPage"));
const WorkflowPage = lazy(() => import("./WorkflowPage"));
const CampsPage = lazy(() => import("./CampsPage"));
const AdminPage = lazy(() => import("./admin/AdminPage"));
const LoginPage = lazy(() => import("./auth/LoginPage"));
const AssessmentIntroPage = lazy(
  () => import("./assessment/AssessmentIntroPage"),
);
const AssessmentQuestionPage = lazy(
  () => import("./assessment/AssessmentQuestionPage"),
);
const AssessmentReviewPage = lazy(
  () => import("./assessment/AssessmentReviewPage"),
);
const AssessmentReportPage = lazy(
  () => import("./assessment/AssessmentReportPage"),
);
const AssessmentPrintPage = lazy(() =>
  import("./assessment/AssessmentReportPage").then((module) => ({
    default: module.AssessmentPrintPage,
  })),
);
const AssessmentAnswersPrintPage = lazy(() =>
  import("./assessment/AssessmentReportPage").then((module) => ({
    default: module.AssessmentAnswersPrintPage,
  })),
);
const AssessmentAdminPage = lazy(
  () => import("./assessment/AssessmentAdminPage"),
);

const pending = (element: ReactNode) => (
  <Suspense fallback={<main className="route-state">正在读取知识地图…</main>}>
    {element}
  </Suspense>
);

function StatusPage({
  code,
  title,
  message,
}: {
  code: string;
  title: string;
  message: string;
}) {
  return (
    <main className="route-state">
      <span>{code}</span>
      <h1>{title}</h1>
      <p>{message}</p>
      <a href="/">返回知识地图</a>
    </main>
  );
}

export const router = createBrowserRouter([
  { path: "/login", element: pending(<LoginPage />) },
  {
    element: <AuthGate />,
    children: [
      { path: "/", element: pending(<HomePage />) },
      { path: "/company", element: pending(<CompanyPage />) },
      { path: "/organization", element: pending(<OrganizationPage />) },
      { path: "/systems", element: pending(<SystemsPage />) },
      { path: "/workflow", element: pending(<WorkflowPage />) },
      { path: "/workflow/:slug", element: pending(<WorkflowPage />) },
      { path: "/camps", element: pending(<CampsPage />) },
      { path: "/voices", element: pending(<CampsPage />) },
      {
        path: "/assessment/geo-foundations",
        element: pending(<AssessmentIntroPage />),
      },
      {
        path: "/assessment/geo-foundations/attempt/:id/question/:position",
        element: pending(<AssessmentQuestionPage />),
      },
      {
        path: "/assessment/geo-foundations/attempt/:id/review",
        element: pending(<AssessmentReviewPage />),
      },
      {
        path: "/assessment/geo-foundations/report/:attemptId",
        element: pending(<AssessmentReportPage />),
      },
      {
        path: "/assessment/geo-foundations/report/:attemptId/print",
        element: pending(<AssessmentPrintPage />),
      },
      {
        path: "/assessment/geo-foundations/report/:attemptId/print/answers",
        element: pending(<AssessmentAnswersPrintPage />),
      },
      {
        path: "/forbidden",
        element: (
          <StatusPage
            code="403"
            title="这条山路尚未开放"
            message="你的角色没有访问该页面的权限。"
          />
        ),
      },
      {
        element: <AdminGate />,
        children: [{ path: "/admin", element: pending(<AdminPage />) }],
      },
      {
        element: <AssessmentAdminGate />,
        children: [
          {
            path: "/admin/assessments",
            element: pending(<AssessmentAdminPage />),
          },
        ],
      },
      {
        path: "*",
        element: (
          <StatusPage
            code="404"
            title="没有找到这条山路"
            message="地址可能已变化，或内容尚未发布。"
          />
        ),
      },
    ],
  },
]);
