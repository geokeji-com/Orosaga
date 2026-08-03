import type {
  CourseCompletion,
  CourseDetail,
  CourseEnrollment,
  CourseExerciseResult,
  CourseLessonPayload,
  CourseSummary,
  SaveCourseFeedback,
} from "@orosaga/contracts";
import { api, jsonBody } from "./api";

const courseSlug = "geo-foundations";

export const courseApi = {
  list: () => api<CourseSummary[]>("/api/v1/courses"),
  detail: () => api<CourseDetail>(`/api/v1/courses/${courseSlug}`),
  enroll: (idempotencyKey: string) =>
    api<CourseEnrollment>(`/api/v1/courses/${courseSlug}/enrollments`, {
      method: "POST",
      body: jsonBody({ idempotencyKey }),
    }),
  enrollment: (enrollmentId: string) =>
    api<CourseEnrollment>(`/api/v1/course-enrollments/${enrollmentId}`),
  lesson: (enrollmentId: string, lessonKey: string, stepKey: string) =>
    api<CourseLessonPayload>(
      `/api/v1/course-enrollments/${enrollmentId}/lessons/${lessonKey}?step=${encodeURIComponent(stepKey)}`,
    ),
  completeStep: (enrollmentId: string, stepKey: string, operationId: string) =>
    api<{ enrollment: CourseEnrollment; nextHref: string | null }>(
      `/api/v1/course-enrollments/${enrollmentId}/steps/${stepKey}`,
      {
        method: "PUT",
        body: jsonBody({ operationId }),
      },
    ),
  submitExercise: (
    enrollmentId: string,
    exerciseKey: string,
    selectedOptionId: "a" | "b" | "c" | "d",
    operationId: string,
  ) =>
    api<CourseExerciseResult>(
      `/api/v1/course-enrollments/${enrollmentId}/exercises/${exerciseKey}/attempts`,
      {
        method: "POST",
        body: jsonBody({ selectedOptionId, operationId }),
      },
    ),
  completion: (enrollmentId: string) =>
    api<CourseCompletion>(
      `/api/v1/course-enrollments/${enrollmentId}/completion`,
    ),
  certificate: (enrollmentId: string) =>
    api<CourseCompletion>(
      `/api/v1/course-enrollments/${enrollmentId}/certificate`,
    ),
  saveFeedback: (enrollmentId: string, value: SaveCourseFeedback) =>
    api<CourseCompletion>(
      `/api/v1/course-enrollments/${enrollmentId}/feedback`,
      {
        method: "PUT",
        body: jsonBody(value),
      },
    ),
};
