import { describe, expect, it } from "vitest";
import { canAccessCurrentCourse } from "./course-access.guard.js";

const auth = (role: "EMPLOYEE" | "EDITOR" | "ADMIN", userId = "user-1") => ({
  userId,
  role,
  csrfHash: "hash",
});

describe("course pilot access", () => {
  it("allows administrators and editors to review the pilot", () => {
    expect(canAccessCurrentCourse(auth("ADMIN"))).toBe(true);
    expect(canAccessCurrentCourse(auth("EDITOR"))).toBe(true);
  });

  it("allows only explicitly authorized employees", () => {
    expect(canAccessCurrentCourse(auth("EMPLOYEE"), "user-2,user-1")).toBe(
      true,
    );
    expect(canAccessCurrentCourse(auth("EMPLOYEE"), "user-2")).toBe(false);
    expect(canAccessCurrentCourse(undefined, "user-1")).toBe(false);
  });

  it("opens a released course to every authenticated employee", () => {
    expect(canAccessCurrentCourse(auth("EMPLOYEE"), "", "RELEASE")).toBe(true);
  });
});
