import type { SessionUser } from "@orosaga/contracts";

const roleLabels: Record<SessionUser["role"], string> = {
  ADMIN: "管理员",
  EDITOR: "编辑者",
  EMPLOYEE: "员工",
};

export function accountInitials(displayName: string) {
  const compact = displayName.trim().replace(/\s+/g, "");
  return Array.from(compact).slice(-2).join("") || "我";
}

export function accountRoleLabel(role: SessionUser["role"]) {
  return roleLabels[role];
}
