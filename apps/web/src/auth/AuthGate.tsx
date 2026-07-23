import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import type { SessionUser } from "@orosaga/contracts";
import { ApiError, api } from "../lib/api";

export function useMe({
  refetchOnMount = false,
}: {
  refetchOnMount?: boolean | "always";
} = {}) {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => api<SessionUser>("/api/v1/me"),
    retry: false,
    staleTime: 60_000,
    refetchOnMount,
  });
}

export function AuthGate() {
  const me = useMe({ refetchOnMount: "always" });
  const location = useLocation();
  const refetch = me.refetch;

  useEffect(() => {
    const revalidateRestoredPage = () => void refetch();
    window.addEventListener("pageshow", revalidateRestoredPage);
    return () => window.removeEventListener("pageshow", revalidateRestoredPage);
  }, [refetch]);

  if (me.isPending || me.isFetching)
    return (
      <main className="route-state">
        <strong>正在进入山海经…</strong>
      </main>
    );
  if (me.error instanceof ApiError && me.error.status === 401) {
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    return (
      <Navigate
        to={`/login?returnTo=${encodeURIComponent(returnTo)}`}
        replace
      />
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
