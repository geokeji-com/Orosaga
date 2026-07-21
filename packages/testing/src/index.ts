import type { SessionUser } from "@orosaga/contracts";

export const employeeFixture: SessionUser = {
  id: "00000000-0000-4000-8000-000000000001",
  feishuOpenId: "ou_test_employee",
  displayName: "测试员工",
  role: "EMPLOYEE",
  status: "ACTIVE",
  permissions: ["content:read"],
  csrfToken: "test-csrf-token",
};

export function asRole(role: SessionUser["role"]): SessionUser {
  return {
    ...employeeFixture,
    role,
    permissions:
      role === "ADMIN"
        ? [
            "content:read",
            "content:write",
            "content:rollback",
            "organization:write-profile",
            "system-links:write",
            "users:write-role",
            "integrations:operate",
            "audit:read",
          ]
        : role === "EDITOR"
          ? ["content:read", "content:write", "organization:write-profile"]
          : ["content:read"],
  };
}
