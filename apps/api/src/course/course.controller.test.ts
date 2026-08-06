import { HEADERS_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";
import {
  CourseController,
  CourseEnrollmentController,
} from "./course.controller.js";

const noStore = [{ name: "Cache-Control", value: "private, no-store" }];

describe("course response cache policy", () => {
  it("prevents caching course content and learner-specific responses", () => {
    const handlers = [
      CourseController.prototype.list,
      CourseController.prototype.detail,
      CourseController.prototype.enroll,
      CourseEnrollmentController.prototype.enrollment,
      CourseEnrollmentController.prototype.lesson,
      CourseEnrollmentController.prototype.completeStep,
      CourseEnrollmentController.prototype.submitExercise,
      CourseEnrollmentController.prototype.completion,
      CourseEnrollmentController.prototype.feedback,
    ];

    for (const handler of handlers)
      expect(Reflect.getMetadata(HEADERS_METADATA, handler)).toEqual(noStore);
  });
});
