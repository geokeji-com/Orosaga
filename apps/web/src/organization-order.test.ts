import { describe, expect, it } from "vitest";
import { compareEmployees } from "./organization-order";

describe("compareEmployees", () => {
  it("sorts independently of database insertion order", () => {
    const rows = [
      { id: "c", displayName: "Zed" },
      { id: "b", displayName: "Alice" },
      { id: "a", displayName: "Alice" },
    ];

    expect(rows.sort(compareEmployees)).toEqual([
      { id: "a", displayName: "Alice" },
      { id: "b", displayName: "Alice" },
      { id: "c", displayName: "Zed" },
    ]);
  });
});
