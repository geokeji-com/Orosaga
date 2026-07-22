import { Navigate, useSearchParams } from "react-router-dom";
import { ApiError } from "../lib/api";
import { BrandMark } from "../components/Brand";
import { useMe } from "./AuthGate";

function safeReturnTo(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return "/";
  if (value.includes("\\") || value.length > 2_048) return "/";
  return value;
}

export default function LoginPage() {
  const me = useMe();
  const [params] = useSearchParams();
  const returnTo = safeReturnTo(params.get("returnTo"));
  const loginHref = `/auth/feishu/login?returnTo=${encodeURIComponent(returnTo)}`;

  if (me.data) return <Navigate to={returnTo} replace />;
  if (me.isPending)
    return (
      <main className="route-state login-page">
        <strong>正在确认登录状态…</strong>
      </main>
    );

  const anonymous = me.error instanceof ApiError && me.error.status === 401;
  return (
    <main className="route-state login-page">
      <BrandMark alt="Orosaga 山海标识" />
      <h1>Orosaga 山海经</h1>
      <p>仅供移山科技内部员工访问。</p>
      {!anonymous && <p role="alert">暂时无法确认登录状态，请重新尝试。</p>}
      {params.get("error") === "oauth" && (
        <p role="alert">飞书登录未完成，请重新尝试。</p>
      )}
      <a className="login-primary" href={loginHref}>
        使用飞书登录
      </a>
    </main>
  );
}
