import { lazy, Suspense } from "react";
import type { ReactNode } from "react";
import { createBrowserRouter } from "react-router-dom";
import { AdminGate, AuthGate } from "./auth/AuthGate";

const HomePage = lazy(() => import("./HomePage"));
const CompanyPage = lazy(() => import("./CompanyPage"));
const OrganizationPage = lazy(() => import("./OrganizationPage"));
const SystemsPage = lazy(() => import("./SystemsPage"));
const WorkflowPage = lazy(() => import("./WorkflowPage"));
const CampsPage = lazy(() => import("./CampsPage"));
const AdminPage = lazy(() => import("./admin/AdminPage"));
const LoginPage = lazy(() => import("./auth/LoginPage"));

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
