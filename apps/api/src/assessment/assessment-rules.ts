export type EligibilityStatus =
  | "AVAILABLE"
  | "IN_PROGRESS"
  | "DAILY_LIMIT_REACHED"
  | "ATTEMPT_LIMIT_REACHED"
  | "REVIEW_REQUIRED"
  | "UNAVAILABLE";

type EligibilityInput = {
  enabled: boolean;
  sourceReviewStatus: "CURRENT" | "REVIEW_REQUIRED";
  attemptsUsed: number;
  attemptedToday: boolean;
  dailyLimit: number;
  maxAttempts: number;
  activeAttempt: { id: string; deadlineAt: Date } | null;
};

export const effectiveSourceReviewStatus = (
  status: "CURRENT" | "REVIEW_REQUIRED",
  reviewDueAt: Date | null,
  now: Date,
) =>
  status === "REVIEW_REQUIRED" || (reviewDueAt !== null && reviewDueAt <= now)
    ? "REVIEW_REQUIRED"
    : "CURRENT";

export const shouldGenerateAssessmentReport = (
  attemptStatus: "IN_PROGRESS" | "SUBMITTED" | "EXPIRED" | "VOIDED",
  reportStatus: "PENDING" | "READY" | "FAILED" | null,
  failureCode: string | null = null,
) =>
  (attemptStatus === "SUBMITTED" || attemptStatus === "EXPIRED") &&
  reportStatus !== "READY" &&
  failureCode !== "DETAIL_RETENTION_EXPIRED";

export const calculateQuotaDate = (at: Date) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(at);
  const value = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${value.year}-${value.month}-${value.day}`;
};

export const capAnswerActiveDuration = (
  currentDurationMs: number,
  incomingDurationMs: number,
  recordedTotalMs: number,
  attemptBudgetMs: number,
) => {
  const otherAnswersDurationMs = Math.max(
    0,
    recordedTotalMs - currentDurationMs,
  );
  const remainingForAnswerMs = Math.max(
    0,
    attemptBudgetMs - otherAnswersDurationMs,
  );
  return Math.min(remainingForAnswerMs, currentDurationMs + incomingDurationMs);
};

export const nextShanghaiDay = (quotaDate: string) => {
  const [year, month, day] = quotaDate.split("-").map(Number);
  return new Date(Date.UTC(year!, month! - 1, day!, 16)).toISOString();
};

export const evaluateAssessmentEligibility = (input: EligibilityInput) => {
  const attemptsRemaining = Math.max(0, input.maxAttempts - input.attemptsUsed);
  if (input.activeAttempt)
    return {
      status: "IN_PROGRESS" as const,
      attemptsRemaining,
      activeAttemptId: input.activeAttempt.id,
      activeDeadlineAt: input.activeAttempt.deadlineAt.toISOString(),
    };
  let status: EligibilityStatus = "AVAILABLE";
  if (!input.enabled) status = "UNAVAILABLE";
  else if (input.sourceReviewStatus === "REVIEW_REQUIRED")
    status = "REVIEW_REQUIRED";
  else if (attemptsRemaining === 0) status = "ATTEMPT_LIMIT_REACHED";
  else if (input.attemptedToday && input.dailyLimit <= 1)
    status = "DAILY_LIMIT_REACHED";
  return {
    status,
    attemptsRemaining,
    activeAttemptId: null,
    activeDeadlineAt: null,
  };
};

export const scoreAssessment = (
  keys: Array<{ questionId: string; correctOptionId: string }>,
  answers: Array<{ questionId: string; selectedOptionId: string }>,
) => {
  const byQuestion = new Map(
    answers.map((answer) => [answer.questionId, answer.selectedOptionId]),
  );
  let correct = 0;
  let incorrect = 0;
  let unanswered = 0;
  const results = keys.map((key) => {
    const selected = byQuestion.get(key.questionId);
    const isCorrect = selected === key.correctOptionId;
    if (!selected) unanswered += 1;
    else if (isCorrect) correct += 1;
    else incorrect += 1;
    return { questionId: key.questionId, isCorrect };
  });
  return {
    score: keys.length ? Math.round((correct / keys.length) * 100) : 0,
    correct,
    incorrect,
    unanswered,
    results,
  };
};
