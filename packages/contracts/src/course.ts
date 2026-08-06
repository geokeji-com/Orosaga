import { z } from "zod";

export const courseSlugSchema = z.literal("geo-foundations");
export const coursePackProfileSchema = z.literal("RELEASE");
export const courseEnrollmentStatusSchema = z.enum([
  "IN_PROGRESS",
  "COMPLETED",
]);
export const courseLessonStateSchema = z.enum([
  "LOCKED",
  "AVAILABLE",
  "IN_PROGRESS",
  "COMPLETED",
]);
export const courseStepKindSchema = z.enum(["STORY", "MODEL", "PRACTICE"]);
export const courseModelLayoutSchema = z.enum([
  "journey",
  "pipeline",
  "overlap",
  "staircase",
  "funnel",
  "layers",
  "answer-unit",
  "network",
  "tree",
  "experiment",
  "evidence-ladder",
  "matrix",
  "roadmap",
  "production-line",
  "gates",
  "state-machine",
  "feedback-loop",
  "conversation-funnel",
  "recovery-chain",
  "workbench",
]);
export type CourseModelLayout = z.infer<typeof courseModelLayoutSchema>;

export const courseModelNodeCountByLayout: Record<CourseModelLayout, number> = {
  journey: 4,
  pipeline: 5,
  overlap: 4,
  staircase: 3,
  funnel: 4,
  layers: 4,
  "answer-unit": 4,
  network: 4,
  tree: 4,
  experiment: 3,
  "evidence-ladder": 4,
  matrix: 4,
  roadmap: 3,
  "production-line": 4,
  gates: 5,
  "state-machine": 5,
  "feedback-loop": 4,
  "conversation-funnel": 4,
  "recovery-chain": 4,
  workbench: 5,
};

export const courseOutlineStepSchema = z.object({
  key: z.string().regex(/^lesson-\d{2}-(story|model|practice)$/),
  kind: courseStepKindSchema,
  label: z.string().min(1).max(8),
  title: z.string().min(1).max(40),
  href: z.string().startsWith("/courses/"),
  state: courseLessonStateSchema,
});
export type CourseOutlineStep = z.infer<typeof courseOutlineStepSchema>;

export const courseOptionSchema = z.object({
  id: z.enum(["a", "b", "c", "d"]),
  text: z.string().min(1).max(500),
});

export const courseLessonSummarySchema = z.object({
  key: z.string().regex(/^lesson-\d{2}$/),
  number: z.number().int().min(1).max(20),
  chapterNumber: z.number().int().min(1).max(5),
  title: z.string().min(1),
  goal: z.string().min(1),
  estimatedMinutes: z.number().int().positive(),
  artifact: z.string().min(1),
  state: courseLessonStateSchema,
  steps: z.array(courseOutlineStepSchema).length(3),
});
export type CourseLessonSummary = z.infer<typeof courseLessonSummarySchema>;

export const courseChapterSchema = z.object({
  key: z.string().regex(/^chapter-\d$/),
  number: z.number().int().min(1).max(5),
  title: z.string().min(1),
  lessons: z.array(courseLessonSummarySchema).length(4),
});
export type CourseChapter = z.infer<typeof courseChapterSchema>;

export const courseEnrollmentSchema = z.object({
  id: z.string().uuid(),
  courseSlug: courseSlugSchema,
  courseVersion: z.string().min(1),
  status: courseEnrollmentStatusSchema,
  completedSteps: z.number().int().min(0).max(60),
  totalSteps: z.literal(60),
  completedLessons: z.number().int().min(0).max(20),
  progressPercent: z.number().int().min(0).max(100),
  currentLessonKey: z.string().nullable(),
  currentStepKey: z.string().nullable(),
  continueHref: z.string().nullable(),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().nullable(),
});
export type CourseEnrollment = z.infer<typeof courseEnrollmentSchema>;

export const courseSummarySchema = z.object({
  slug: courseSlugSchema,
  shortTitle: z.literal("GEO 实战训练营"),
  title: z.literal("从 AI 回答到 GEO 交付"),
  description: z.string(),
  packProfile: coursePackProfileSchema,
  version: z.string(),
  lessonCount: z.literal(20),
  estimatedMinutes: z.number().int().positive(),
  enrollment: courseEnrollmentSchema.nullable(),
});
export type CourseSummary = z.infer<typeof courseSummarySchema>;

export const courseDetailSchema = courseSummarySchema.extend({
  greeting: z.object({
    title: z.string(),
    detail: z.string(),
    actionLabel: z.string(),
  }),
  chapters: z.array(courseChapterSchema).length(5),
});
export type CourseDetail = z.infer<typeof courseDetailSchema>;

export const createCourseEnrollmentSchema = z.object({
  idempotencyKey: z.string().min(16).max(128),
});

export const courseModelSchema = z
  .object({
    title: z.string().min(1).max(40),
    layout: courseModelLayoutSchema,
    category: z.string().min(1).max(20),
    readingHint: z.string().min(1).max(60),
    nodes: z
      .array(
        z.object({
          key: z.string().min(1).max(64),
          label: z.string().min(1).max(16),
          description: z.string().min(1).max(60),
          tone: z.enum(["blue", "green", "amber", "violet"]),
        }),
      )
      .min(3)
      .max(6),
    caption: z.string().min(1).max(120),
  })
  .superRefine((model, context) => {
    const expectedCount = courseModelNodeCountByLayout[model.layout];
    if (model.nodes.length !== expectedCount)
      context.addIssue({
        code: "custom",
        path: ["nodes"],
        message: `${model.layout} layout requires ${expectedCount} nodes`,
      });

    const seenKeys = new Set<string>();
    model.nodes.forEach((node, index) => {
      if (seenKeys.has(node.key))
        context.addIssue({
          code: "custom",
          path: ["nodes", index, "key"],
          message: "model node keys must be unique",
        });
      seenKeys.add(node.key);
    });
  });

export const courseStepSchema = z.object({
  key: z.string(),
  lessonKey: z.string(),
  position: z.number().int().min(1).max(3),
  kind: courseStepKindSchema,
  eyebrow: z.string(),
  title: z.string(),
  intro: z.string(),
  actionLabel: z.string().min(1).max(40),
  sections: z.array(
    z.object({
      label: z.string(),
      title: z.string(),
      body: z.string(),
      tone: z.enum(["neutral", "danger", "success", "principle"]),
    }),
  ),
  model: courseModelSchema.nullable(),
  exercise: z
    .object({
      key: z.string(),
      stem: z.string(),
      options: z.array(courseOptionSchema).length(4),
    })
    .nullable(),
  completed: z.boolean(),
});
export type CourseStep = z.infer<typeof courseStepSchema>;

export const courseLessonPayloadSchema = z.object({
  course: courseSummarySchema.omit({ enrollment: true }),
  enrollment: courseEnrollmentSchema,
  lesson: courseLessonSummarySchema,
  chapters: z.array(courseChapterSchema).length(5),
  step: courseStepSchema,
  previousHref: z.string().nullable(),
  nextHref: z.string().nullable(),
});
export type CourseLessonPayload = z.infer<typeof courseLessonPayloadSchema>;

export const completeCourseStepSchema = z.object({
  operationId: z.string().min(16).max(128),
});

export const submitCourseExerciseSchema = z.object({
  selectedOptionId: z.enum(["a", "b", "c", "d"]),
  operationId: z.string().min(16).max(128),
});

export const courseExerciseResultSchema = z.object({
  correct: z.boolean(),
  selectedOptionId: z.enum(["a", "b", "c", "d"]),
  hint: z.string(),
  analysis: z.string(),
  optionAnalyses: z.array(
    z.object({
      optionId: z.enum(["a", "b", "c", "d"]),
      text: z.string(),
    }),
  ),
  enrollment: courseEnrollmentSchema,
  nextHref: z.string().nullable(),
});
export type CourseExerciseResult = z.infer<typeof courseExerciseResultSchema>;

export const saveCourseFeedbackSchema = z.object({
  usefulness: z.number().int().min(1).max(5),
  clarity: z.number().int().min(1).max(5),
  difficulty: z.number().int().min(1).max(5),
  recommendation: z.number().int().min(1).max(5),
  mostHelpfulLessonKey: z
    .string()
    .regex(/^lesson-(0[1-9]|1\d|20)$/)
    .nullable(),
  comment: z.string().max(2000).default(""),
});
export type SaveCourseFeedback = z.infer<typeof saveCourseFeedbackSchema>;

export const courseCompletionSchema = z.object({
  completed: z.boolean(),
  packProfile: coursePackProfileSchema,
  completedLessons: z.number().int().min(0).max(20),
  lessonCount: z.literal(20),
  feedbackSubmitted: z.boolean(),
});
export type CourseCompletion = z.infer<typeof courseCompletionSchema>;

export const appVersionSchema = z.object({
  version: z.string(),
  commit: z.string(),
  builtAt: z.string(),
});
export type AppVersion = z.infer<typeof appVersionSchema>;
