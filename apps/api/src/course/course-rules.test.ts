import { describe, expect, it } from "vitest";
import { courseStepKeys } from "./course-catalog.js";
import {
  adjacentCourseHrefs,
  canOpenCourseStep,
  courseOutline,
  courseProgress,
} from "./course-rules.js";

describe("course progression rules", () => {
  it("opens the first step and locks later lessons", () => {
    expect(canOpenCourseStep("lesson-01-story", [])).toBe(true);
    expect(canOpenCourseStep("lesson-01-model", [])).toBe(false);
    expect(courseOutline([])[0]!.lessons.map((item) => item.state)).toEqual([
      "AVAILABLE",
      "LOCKED",
      "LOCKED",
      "LOCKED",
    ]);
    expect(
      courseOutline([])[0]!.lessons[0]!.steps.map((step) => step.state),
    ).toEqual(["AVAILABLE", "LOCKED", "LOCKED"]);
  });

  it("exposes three nested steps with progressive links and states", () => {
    const lesson = courseOutline(["lesson-01-story"])[0]!.lessons[0]!;

    expect(lesson.steps).toEqual([
      expect.objectContaining({
        key: "lesson-01-story",
        label: "场景",
        state: "COMPLETED",
      }),
      expect.objectContaining({
        key: "lesson-01-model",
        label: "方法",
        state: "AVAILABLE",
      }),
      expect.objectContaining({
        key: "lesson-01-practice",
        label: "练习",
        state: "LOCKED",
      }),
    ]);
    expect(lesson.steps[1]!.href).toBe(
      "/courses/geo-foundations/lesson/lesson-01/step/lesson-01-model",
    );
  });

  it("unlocks the next lesson after a correct practice completion", () => {
    const completed = courseStepKeys.slice(0, 3);
    expect(canOpenCourseStep("lesson-02-story", completed)).toBe(true);
    expect(courseOutline(completed)[0]!.lessons[0]!.state).toBe("COMPLETED");
    expect(courseOutline(completed)[0]!.lessons[1]!.state).toBe("AVAILABLE");
  });

  it("returns stable progress and completion state", () => {
    const partial = courseProgress(courseStepKeys.slice(0, 6));
    expect(partial.completedLessons).toBe(2);
    expect(partial.currentStepKey).toBe("lesson-03-story");
    expect(partial.progressPercent).toBe(10);

    const complete = courseProgress(courseStepKeys);
    expect(complete.complete).toBe(true);
    expect(complete.progressPercent).toBe(100);
    expect(complete.continueHref).toBeNull();
  });

  it("routes the final practice to completion", () => {
    expect(adjacentCourseHrefs("lesson-20-practice").nextHref).toBe(
      "/courses/geo-foundations/completion",
    );
  });
});
