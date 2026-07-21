import { useQuery } from "@tanstack/react-query";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import type { SessionUser } from "@orosaga/contracts";
import { ApiError, api } from "../lib/api";

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => api<SessionUser>("/api/v1/me"),
    retry: false,
    staleTime: 60_000,
  });
}

export function AuthGate() {
  const me = useMe();
  if (me.isPending)
    return (
      <main className="route-state">
        <strong>正在进入山海经…</strong>
      </main>
    );
  if (me.error instanceof ApiError && me.error.status === 401) {
    return (
      <main className="route-state">
        <img src="/favicon.svg" alt="" />
        <h1>Orosaga 山海经</h1>
        <p>仅供移山科技内部员工访问。</p>
        <a className="primary-button" href="/auth/feishu/login">
          使用飞书登录
        </a>
      </main>
    );
  }
  if (me.isError)
    return (
      <main className="route-state">
        <h1>暂时无法进入</h1>
        <p>{me.error.message}</p>
        <button onClick={() => void me.refetch()}>重试</button>
      </main>
    );
  return <Outlet />;
}

export function AdminGate() {
  const me = useMe();
  const location = useLocation();
  if (me.data?.role !== "ADMIN" && me.data?.role !== "EDITOR")
    return (
      <Navigate to="/forbidden" replace state={{ from: location.pathname }} />
    );
  return <Outlet />;
}
