import { describe, expect, it } from "vitest";
import {
  compareEmployees,
  departmentsWithMembers,
  isDepartmentHead,
} from "./organization-order";

describe("departmentsWithMembers", () => {
  it("omits departments without active members", () => {
    const departments = [
      { id: "sales", name: "销售部", parentId: null },
      { id: "finance", name: "财务部", parentId: null },
      { id: "email", name: "仅邮箱", parentId: null },
    ];

    expect(
      departmentsWithMembers(departments, [
        { departmentId: "sales" },
        { departmentId: "sales" },
      ]),
    ).toEqual([{ id: "sales", name: "销售部", parentId: null }]);
  });
});

describe("compareEmployees", () => {
  it("sorts independently of database insertion order", () => {
    const rows = [
      { id: "c", displayName: "Zed", title: "" },
      { id: "b", displayName: "Alice", title: "" },
      { id: "a", displayName: "Alice", title: "" },
    ];

    expect(rows.sort(compareEmployees)).toEqual([
      { id: "a", displayName: "Alice", title: "" },
      { id: "b", displayName: "Alice", title: "" },
      { id: "c", displayName: "Zed", title: "" },
    ]);
  });

  it("keeps the explicit department head ahead of alphabetic ordering", () => {
    const rows = [
      { id: "a", displayName: "刘子瑜", title: "销售协作" },
      { id: "b", displayName: "唐小新", title: "销售部负责人" },
      { id: "c", displayName: "李泽辰", title: "技术研发" },
    ];

    expect(rows.sort(compareEmployees).map((item) => item.id)).toEqual([
      "b",
      "a",
      "c",
    ]);
  });

  it("does not treat project owners or administrators as department heads", () => {
    expect(isDepartmentHead({ title: "项目负责人" })).toBe(false);
    expect(isDepartmentHead({ title: "技术部负责人" })).toBe(true);
  });
});
