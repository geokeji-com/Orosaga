import { z } from "zod";

export const assessmentDimensionSchema = z.enum(["D1", "D2", "D3", "D4", "D5"]);
export const assessmentSourceTypeSchema = z.enum(["PAPER", "DATA", "BUSINESS"]);
export const assessmentDifficultySchema = z.enum(["L1", "L2", "L3"]);
export const assessmentAttemptStatusSchema = z.enum([
  "IN_PROGRESS",
  "SUBMITTED",
  "EXPIRED",
  "VOIDED",
]);
export const assessmentVersionStatusSchema = z.enum([
  "DRAFT",
  "VALIDATED",
  "PUBLISHED",
  "RETIRED",
]);
export const assessmentSourceReviewStatusSchema = z.enum([
  "CURRENT",
  "REVIEW_REQUIRED",
]);
export const assessmentHumanGateStatusSchema = z.enum([
  "PENDING_HUMAN",
  "APPROVED",
]);

export const assessmentOptionSchema = z.object({
  id: z.enum(["a", "b", "c", "d"]),
  text: z.string().min(1).max(500),
});

export const assessmentQuestionSchema = z.object({
  id: z.string().uuid(),
  stableKey: z.string().regex(/^GEO-\d{3}$/),
  position: z.number().int().min(1).max(50),
  primaryDimension: assessmentDimensionSchema,
  difficulty: assessmentDifficultySchema,
  stem: z.string().min(1).max(1000),
  options: z.array(assessmentOptionSchema).length(4),
  selectedOptionId: z.enum(["a", "b", "c", "d"]).nullable(),
  answerRevision: z.number().int().nonnegative(),
});
export type AssessmentQuestion = z.infer<typeof assessmentQuestionSchema>;

export const assessmentEligibilitySchema = z.object({
  assessmentSlug: z.string(),
  title: z.string(),
  enabled: z.boolean(),
  status: z.enum([
    "AVAILABLE",
    "IN_PROGRESS",
    "DAILY_LIMIT_REACHED",
    "ATTEMPT_LIMIT_REACHED",
    "REVIEW_REQUIRED",
    "UNAVAILABLE",
  ]),
  cycleKey: z.string().nullable(),
  version: z.string().nullable(),
  dailyLimit: z.number().int().positive(),
  maxAttempts: z.number().int().positive(),
  attemptsUsed: z.number().int().nonnegative(),
  attemptsRemaining: z.number().int().nonnegative(),
  attemptedToday: z.boolean(),
  nextEligibleAt: z.string().datetime().nullable(),
  activeAttemptId: z.string().uuid().nullable(),
  activeDeadlineAt: z.string().datetime().nullable(),
  latestScore: z.number().min(0).max(100).nullable(),
  bestScore: z.number().min(0).max(100).nullable(),
  passed: z.boolean(),
  passScore: z.number().min(0).max(100).nullable(),
});
export type AssessmentEligibility = z.infer<typeof assessmentEligibilitySchema>;

export const createAssessmentAttemptSchema = z.object({
  idempotencyKey: z.string().min(16).max(128),
});

export const saveAssessmentAnswerSchema = z.object({
  selectedOptionId: z.enum(["a", "b", "c", "d"]),
  revision: z.number().int().nonnegative(),
  activeDurationMs: z.number().int().min(0).max(1_800_000),
});

export const assessmentAttemptSchema = z.object({
  id: z.string().uuid(),
  status: assessmentAttemptStatusSchema,
  attemptNumber: z.number().int().positive(),
  startedAt: z.string().datetime(),
  deadlineAt: z.string().datetime(),
  submittedAt: z.string().datetime().nullable(),
  answeredCount: z.number().int().min(0).max(50),
  questionCount: z.number().int().positive(),
  score: z.number().min(0).max(100).nullable(),
  version: z.string(),
});
export type AssessmentAttempt = z.infer<typeof assessmentAttemptSchema>;

export const assessmentAttemptDetailSchema = assessmentAttemptSchema.extend({
  assessmentSlug: z.string(),
  title: z.string(),
  passScore: z.number().min(0).max(100),
});
export type AssessmentAttemptDetail = z.infer<
  typeof assessmentAttemptDetailSchema
>;

export const assessmentReviewItemSchema = z.object({
  questionId: z.string().uuid(),
  position: z.number().int().min(1).max(50),
  answered: z.boolean(),
});
export const assessmentReviewSchema = z.object({
  attempt: assessmentAttemptSchema,
  items: z.array(assessmentReviewItemSchema),
});
export type AssessmentReview = z.infer<typeof assessmentReviewSchema>;

const aggregateResultSchema = z.object({
  key: z.string(),
  label: z.string(),
  correct: z.number().int().nonnegative(),
  total: z.number().int().positive(),
  accuracy: z.number().min(0).max(1),
  note: z.string().optional(),
});

const misconceptionResultSchema = z.object({
  code: z.string(),
  label: z.string(),
  count: z.number().int().positive(),
  questionKeys: z.array(z.string()),
});

const timingItemSchema = z.object({
  questionKey: z.string(),
  durationMs: z.number().int().nonnegative(),
  correct: z.boolean(),
  difficulty: assessmentDifficultySchema,
});

const recommendationSchema = z.object({
  priority: z.number().int().min(1).max(8),
  title: z.string(),
  reason: z.string(),
  evidence: z.array(z.string()),
  learningPaths: z.array(z.string()),
  practice: z.string(),
  completionCriteria: z.string(),
});

const questionResultSchema = z.object({
  questionId: z.string().uuid(),
  stableKey: z.string(),
  position: z.number().int().positive(),
  primaryDimension: assessmentDimensionSchema,
  difficulty: assessmentDifficultySchema,
  businessImportance: z.number().int().min(1).max(5),
  stem: z.string(),
  options: z.array(
    assessmentOptionSchema.extend({
      rationale: z.string(),
      selected: z.boolean(),
      correct: z.boolean(),
    }),
  ),
  selectedOptionId: z.enum(["a", "b", "c", "d"]).nullable(),
  correctOptionId: z.enum(["a", "b", "c", "d"]),
  correct: z.boolean(),
  coreRationale: z.string(),
  reasoningSteps: z.array(z.string()),
  businessApplication: z.string(),
  sourceIds: z.array(z.string()),
  learningPaths: z.array(z.string()),
  misconceptionCode: z.string().nullable(),
  activeDurationMs: z.number().int().nonnegative(),
  changeCount: z.number().int().nonnegative(),
});

const assessmentHistoryPointSchema = z.object({
  attemptNumber: z.number().int().positive(),
  score: z.number().min(0).max(100),
  submittedAt: z.string().datetime(),
  dimensionScores: z.record(z.string(), z.number().min(0).max(100)),
});

export const assessmentReportPayloadSchema = z.object({
  reportVersion: z.string(),
  generatedAt: z.string().datetime(),
  score: z.number().min(0).max(100),
  passScore: z.number().min(0).max(100),
  passed: z.boolean(),
  resultCounts: z.object({
    correct: z.number().int().nonnegative(),
    incorrect: z.number().int().nonnegative(),
    unanswered: z.number().int().nonnegative(),
  }),
  dimensions: z.array(aggregateResultSchema),
  sources: z.array(aggregateResultSchema),
  difficulties: z.array(aggregateResultSchema),
  topics: z.array(aggregateResultSchema),
  stages: z.array(aggregateResultSchema),
  misconceptions: z.array(misconceptionResultSchema),
  timing: z.object({
    totalDurationMs: z.number().int().nonnegative(),
    averageDurationMs: z.number().int().nonnegative(),
    items: z.array(timingItemSchema),
  }),
  recommendations: z.array(recommendationSchema),
  questionResults: z.array(questionResultSchema),
  history: z.array(assessmentHistoryPointSchema),
});
export type AssessmentReportPayload = z.infer<
  typeof assessmentReportPayloadSchema
>;

export const assessmentReportResponseSchema = z.object({
  attempt: assessmentAttemptSchema,
  status: z.enum(["PENDING", "READY", "FAILED"]),
  failureCode: z.string().nullable(),
  payload: assessmentReportPayloadSchema.nullable(),
  voided: z.boolean(),
});
export type AssessmentReportResponse = z.infer<
  typeof assessmentReportResponseSchema
>;

const privateOptionSchema = assessmentOptionSchema.extend({
  rationale: z.string().min(1).max(2000),
  misconception: z.string().nullable(),
});

export const assessmentImportQuestionSchema = z
  .object({
    id: z.string().regex(/^GEO-\d{3}$/),
    primaryDimension: assessmentDimensionSchema,
    sourceType: assessmentSourceTypeSchema,
    difficulty: assessmentDifficultySchema,
    topic: z.string().min(1),
    deliveryStages: z.array(z.string().min(1)).min(1),
    businessImportance: z.number().int().min(1).max(5),
    evidenceQueryId: z
      .string()
      .regex(/^DQ-\d{3}$/)
      .optional(),
    stem: z.string().min(1).max(1000),
    options: z.array(privateOptionSchema).length(4),
    correctOptionId: z.enum(["a", "b", "c", "d"]),
    coreRationale: z.string().min(1).max(4000),
    reasoningSteps: z.array(z.string().min(1)).min(2),
    businessApplication: z.string().min(1).max(2000),
    sourceIds: z.array(z.string().min(1)).min(1),
    learningPath: z.array(z.string().min(1)).min(1),
  })
  .superRefine((question, context) => {
    const optionIds = new Set(question.options.map((option) => option.id));
    if (optionIds.size !== 4)
      context.addIssue({
        code: "custom",
        path: ["options"],
        message: "四个选项 ID 必须唯一",
      });
    if (!optionIds.has(question.correctOptionId))
      context.addIssue({
        code: "custom",
        path: ["correctOptionId"],
        message: "标准答案必须指向现有选项",
      });
    if (question.sourceType === "DATA" && !question.evidenceQueryId)
      context.addIssue({
        code: "custom",
        path: ["evidenceQueryId"],
        message: "数据题必须关联可复算查询",
      });
    for (const option of question.options) {
      const isCorrect = option.id === question.correctOptionId;
      if (isCorrect && option.misconception !== null)
        context.addIssue({
          code: "custom",
          path: ["options", option.id, "misconception"],
          message: "标准答案不能标记误区",
        });
      if (!isCorrect && option.misconception === null)
        context.addIssue({
          code: "custom",
          path: ["options", option.id, "misconception"],
          message: "干扰项必须标记误区",
        });
    }
  });

export const assessmentImportPackSchema = z.object({
  schemaVersion: z.union([z.literal(1), z.literal("1.0.0")]),
  assessment: z.object({
    slug: z.string().regex(/^[a-z0-9-]+$/),
    title: z.string().min(1),
    version: z.string().min(1),
    purpose: z.literal("TRAINING_MASTERY"),
    questionCount: z.literal(50),
    durationMinutes: z.literal(30),
    passScore: z.number().int().min(0).max(100),
    dailyLimit: z.literal(1),
    cycleAttemptLimit: z.literal(3),
    sourceCommit: z.string().regex(/^[0-9a-f]{40}$/),
    datasetVersion: z.string().min(1),
    businessContentHash: z.string().regex(/^[0-9a-f]{64}$/),
    workflowHash: z.string().regex(/^[0-9a-f]{64}$/),
    sourceReviewStatus: assessmentSourceReviewStatusSchema,
    contentReviewStatus: z.literal("PENDING_HUMAN"),
    angoffStatus: z.literal("PENDING_HUMAN"),
    pilotStatus: z.literal("PENDING_HUMAN"),
  }),
  questions: z.array(assessmentImportQuestionSchema).length(50),
});
export type AssessmentImportPack = z.infer<typeof assessmentImportPackSchema>;

export const assessmentAdminVersionSchema = z.object({
  id: z.string().uuid(),
  assessmentSlug: z.string(),
  title: z.string(),
  enabled: z.boolean(),
  cycleKey: z.string(),
  version: z.string(),
  status: assessmentVersionStatusSchema,
  sourceReviewStatus: assessmentSourceReviewStatusSchema,
  contentReviewStatus: assessmentHumanGateStatusSchema,
  angoffStatus: assessmentHumanGateStatusSchema,
  pilotStatus: assessmentHumanGateStatusSchema,
  questionCount: z.number().int().nonnegative(),
  contentHash: z.string(),
  passScore: z.number().min(0).max(100),
  reviewDueAt: z.string().datetime().nullable(),
  publishedAt: z.string().datetime().nullable(),
});

export const assessmentGateApprovalSchema = z.object({
  contentReviewStatus: z.literal("APPROVED"),
  angoffStatus: z.literal("APPROVED"),
  pilotStatus: z.literal("APPROVED"),
  sourceReviewStatus: z.literal("CURRENT"),
  passScore: z.number().int().min(0).max(100),
  reviewReference: z.string().min(10).max(500),
});

export const voidAssessmentAttemptSchema = z.object({
  reasonCode: z.enum(["TECHNICAL", "CONTENT_ERROR", "SECURITY", "OTHER"]),
  reason: z.string().min(10).max(500),
});
