import type {
  AssessmentAttempt,
  AssessmentAttemptDetail,
  AssessmentEligibility,
  AssessmentQuestion,
  AssessmentReportPayload,
  AssessmentReportResponse,
  AssessmentReview,
} from "@orosaga/contracts";
import { api, jsonBody } from "./api";

export type AssessmentOverview = AssessmentEligibility & {
  history: AssessmentAttempt[];
};

export type AssessmentVersionSummary = {
  id: string;
  assessmentSlug: string;
  title: string;
  enabled: boolean;
  cycleKey: string;
  version: string;
  status: "DRAFT" | "VALIDATED" | "PUBLISHED" | "RETIRED";
  sourceReviewStatus: "CURRENT" | "REVIEW_REQUIRED";
  contentReviewStatus: "PENDING_HUMAN" | "APPROVED";
  angoffStatus: "PENDING_HUMAN" | "APPROVED";
  pilotStatus: "PENDING_HUMAN" | "APPROVED";
  questionCount: number;
  contentHash: string;
  passScore: number;
  reviewDueAt: string | null;
  publishedAt: string | null;
};

export type AssessmentQuality = {
  versionId: string;
  version: string;
  firstAttemptSampleSize: number;
  items: Array<{
    questionId: string;
    stableKey: string;
    position: number;
    sampleSize: number;
    answered: number;
    correct: number;
    accuracy: number;
    unanswered: number;
    optionCounts: Record<string, number>;
    medianDurationMs: number;
    p90DurationMs: number;
    rapidAnswerCount: number;
    changedAnswerCount: number;
    pointBiserial: number | null;
    note: string | null;
  }>;
};

export type AssessmentAdminAttempt = {
  id: string;
  employee: string;
  assessment: string;
  version: string;
  attemptNumber: number;
  status: "IN_PROGRESS" | "SUBMITTED" | "EXPIRED" | "VOIDED";
  kind: "FORMAL" | "PILOT";
  score: number | null;
  firstScore: number | null;
  bestScore: number | null;
  passed: boolean;
  startedAt: string;
  submittedAt: string | null;
};

export type AssessmentPilotParticipant = {
  userId: string;
  displayName: string;
  grantedAt: string;
  revokedAt: string | null;
  attemptId: string | null;
  attemptStatus: "IN_PROGRESS" | "SUBMITTED" | "EXPIRED" | "VOIDED" | null;
};

export const assessmentApi = {
  overview: () =>
    api<AssessmentOverview>("/api/v1/assessments/geo-foundations"),
  createAttempt: (idempotencyKey: string) =>
    api<AssessmentAttempt>("/api/v1/assessments/geo-foundations/attempts", {
      method: "POST",
      body: jsonBody({ idempotencyKey }),
    }),
  attempt: (id: string) =>
    api<AssessmentAttemptDetail>(`/api/v1/assessment-attempts/${id}`),
  question: (id: string, position: number) =>
    api<AssessmentQuestion>(
      `/api/v1/assessment-attempts/${id}/questions/${position}`,
    ),
  review: (id: string) =>
    api<AssessmentReview>(`/api/v1/assessment-attempts/${id}/review`),
  saveAnswer: (
    id: string,
    questionId: string,
    value: {
      selectedOptionId: "a" | "b" | "c" | "d";
      revision: number;
      activeDurationMs: number;
    },
  ) =>
    api<{ revision: number; answeredCount: number }>(
      `/api/v1/assessment-attempts/${id}/answers/${questionId}`,
      { method: "PUT", body: jsonBody(value) },
    ),
  submit: (id: string) =>
    api<AssessmentAttempt>(`/api/v1/assessment-attempts/${id}/submit`, {
      method: "POST",
    }),
  report: (id: string) =>
    api<AssessmentReportResponse>(`/api/v1/assessment-attempts/${id}/report`),
  adminVersions: () =>
    api<AssessmentVersionSummary[]>("/api/v1/admin/assessments"),
  adminAttempts: () =>
    api<AssessmentAdminAttempt[]>("/api/v1/admin/assessment-attempts"),
  adminQuality: (id: string) =>
    api<AssessmentQuality>(`/api/v1/admin/assessment-versions/${id}/quality`),
  adminReport: (id: string) =>
    api<{
      status: "PENDING" | "READY" | "FAILED";
      failureCode: string | null;
      payload: AssessmentReportPayload | null;
      voided: boolean;
    }>(`/api/v1/admin/assessment-attempts/${id}/report`),
  validateVersion: (id: string) =>
    api(`/api/v1/admin/assessment-versions/${id}/validate`, { method: "POST" }),
  approveGates: (
    id: string,
    reviewReference: string,
    passScore: number,
    pilotStatus: "PENDING_HUMAN" | "APPROVED",
  ) =>
    api(`/api/v1/admin/assessment-versions/${id}/gates`, {
      method: "POST",
      body: jsonBody({
        contentReviewStatus: "APPROVED",
        angoffStatus: "APPROVED",
        pilotStatus,
        sourceReviewStatus: "CURRENT",
        reviewReference,
        passScore,
      }),
    }),
  publishVersion: (id: string) =>
    api(`/api/v1/admin/assessment-versions/${id}/publish`, { method: "POST" }),
  retireVersion: (id: string) =>
    api(`/api/v1/admin/assessment-versions/${id}/retire`, { method: "POST" }),
  pilotParticipants: (id: string) =>
    api<AssessmentPilotParticipant[]>(
      `/api/v1/admin/assessment-versions/${id}/pilot-participants`,
    ),
  grantPilotParticipant: (id: string, userId: string) =>
    api(`/api/v1/admin/assessment-versions/${id}/pilot-participants`, {
      method: "POST",
      body: jsonBody({ userId }),
    }),
  revokePilotParticipant: (id: string, userId: string) =>
    api(
      `/api/v1/admin/assessment-versions/${id}/pilot-participants/${userId}`,
      {
        method: "DELETE",
      },
    ),
  voidAttempt: (
    id: string,
    reasonCode: "TECHNICAL" | "CONTENT_ERROR" | "SECURITY" | "OTHER",
    reason: string,
  ) =>
    api(`/api/v1/admin/assessment-attempts/${id}/void`, {
      method: "POST",
      body: jsonBody({ reasonCode, reason }),
    }),
};
