import { useEffect, useId, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, LogOut } from "lucide-react";
import { useMe } from "../auth/AuthGate";
import { ApiError, api } from "../lib/api";
import { replaceWithLogin } from "../lib/session-navigation";
import { accountInitials, accountRoleLabel } from "./account-menu-model";

export function AccountMenu() {
  const me = useMe();
  const queryClient = useQueryClient();
  const menuId = `account-menu-${useId().replaceAll(":", "")}`;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [logoutPending, setLogoutPending] = useState(false);
  const [logoutError, setLogoutError] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!me.data) return null;
  const user = me.data;
  const initials = accountInitials(user.displayName);

  const finishLogout = () => {
    queryClient.clear();
    replaceWithLogin();
  };

  const logout = async () => {
    if (logoutPending) return;
    setLogoutPending(true);
    setLogoutError(false);
    try {
      await api<void>("/api/v1/logout", { method: "POST" });
      finishLogout();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        finishLogout();
        return;
      }
      setLogoutPending(false);
      setLogoutError(true);
    }
  };

  return (
    <div className="account-menu" ref={rootRef}>
      <button
        ref={triggerRef}
        className="account-menu-trigger"
        type="button"
        aria-label={`账户：${user.displayName}`}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => {
          setLogoutError(false);
          setOpen((current) => !current);
        }}
      >
        <span className="account-menu-avatar" aria-hidden="true">
          {initials}
        </span>
        <span className="account-menu-name">{user.displayName}</span>
        <ChevronDown
          className="account-menu-chevron"
          size={14}
          strokeWidth={1.8}
          aria-hidden="true"
        />
      </button>
      {open && (
        <section
          id={menuId}
          className="account-menu-popover"
          aria-label="当前账户"
        >
          <div className="account-menu-identity">
            <span className="account-menu-avatar account-menu-avatar-large">
              {initials}
            </span>
            <span>
              <strong>{user.displayName}</strong>
              <small>{accountRoleLabel(user.role)}</small>
            </span>
          </div>
          <button
            className="account-menu-logout"
            type="button"
            disabled={logoutPending}
            onClick={() => void logout()}
          >
            <LogOut size={16} strokeWidth={1.8} aria-hidden="true" />
            {logoutPending ? "正在退出…" : "退出登录"}
          </button>
          {logoutError && (
            <p className="account-menu-error" role="alert">
              退出失败，请稍后重试。
            </p>
          )}
        </section>
      )}
    </div>
  );
}
