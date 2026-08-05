import { describe, expect, it } from "vitest";
import { roleAllows } from "./auth.guards.js";

describe("role inheritance", () => {
  it("keeps assessment management separate from content and global administration", () => {
    expect(roleAllows("ASSESSMENT_MANAGER", "EMPLOYEE")).toBe(true);
    expect(roleAllows("ASSESSMENT_MANAGER", "ASSESSMENT_MANAGER")).toBe(true);
    expect(roleAllows("ASSESSMENT_MANAGER", "EDITOR")).toBe(false);
    expect(roleAllows("ASSESSMENT_MANAGER", "ADMIN")).toBe(false);
  });

  it("lets global administrators manage assessments without weakening editor access", () => {
    expect(roleAllows("ADMIN", "ASSESSMENT_MANAGER")).toBe(true);
    expect(roleAllows("EDITOR", "ASSESSMENT_MANAGER")).toBe(false);
  });
});
