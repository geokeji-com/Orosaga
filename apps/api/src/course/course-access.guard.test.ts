import { describe, expect, it } from "vitest";
import { canAccessCurrentCourse } from "./course-access.guard.js";

const auth = (
  role: "EMPLOYEE" | "EDITOR" | "ASSESSMENT_MANAGER" | "ADMIN",
  userId = "user-1",
) => ({
  userId,
  role,
  csrfHash: "hash",
});

describe("course release access", () => {
  it("opens the course to every authenticated internal role", () => {
    expect(canAccessCurrentCourse(auth("EMPLOYEE"))).toBe(true);
    expect(canAccessCurrentCourse(auth("ADMIN"))).toBe(true);
    expect(canAccessCurrentCourse(auth("EDITOR"))).toBe(true);
    expect(canAccessCurrentCourse(auth("ASSESSMENT_MANAGER"))).toBe(true);
  });

  it("does not treat an absent session as course access", () => {
    expect(canAccessCurrentCourse(undefined)).toBe(false);
  });
});
