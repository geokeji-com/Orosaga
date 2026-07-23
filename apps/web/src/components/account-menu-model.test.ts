import { describe, expect, it } from "vitest";
import { accountInitials, accountRoleLabel } from "./account-menu-model";

describe("account menu presentation", () => {
  it("builds compact initials without exposing an external identifier", () => {
    expect(accountInitials("李泽辰")).toBe("泽辰");
    expect(accountInitials("Ada Lovelace")).toBe("ce");
    expect(accountInitials("")).toBe("我");
  });

  it("localizes every portal role", () => {
    expect(accountRoleLabel("ADMIN")).toBe("管理员");
    expect(accountRoleLabel("EDITOR")).toBe("编辑者");
    expect(accountRoleLabel("EMPLOYEE")).toBe("员工");
  });
});
