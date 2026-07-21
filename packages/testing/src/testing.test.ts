import { describe, expect, it } from "vitest";
import { asRole } from "./index.js";

describe("role fixture", () => {
  it("adds admin-only permissions", () => {
    expect(asRole("ADMIN").permissions).toContain("users:write-role");
    expect(asRole("EMPLOYEE").permissions).not.toContain("content:write");
  });
});
