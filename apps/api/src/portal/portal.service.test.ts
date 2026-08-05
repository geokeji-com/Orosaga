import { describe, expect, it } from "vitest";
import { canReadSystemLink } from "./portal.service.js";

describe("system link visibility", () => {
  it("keeps assessment managers at the employee system-link tier", () => {
    expect(canReadSystemLink("ASSESSMENT_MANAGER", "EMPLOYEE")).toBe(true);
    expect(canReadSystemLink("ASSESSMENT_MANAGER", "EDITOR")).toBe(false);
    expect(canReadSystemLink("ASSESSMENT_MANAGER", "ADMIN")).toBe(false);
  });
});
