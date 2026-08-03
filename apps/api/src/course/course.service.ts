import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  completeCourseStepSchema,
  createCourseEnrollmentSchema,
  saveCourseFeedbackSchema,
  submitCourseExerciseSchema,
} from "@orosaga/contracts";
import { PrismaService } from "../prisma/prisma.service.js";
import {
  courseDefinition,
  courseLessonByKey,
  courseStepFor,
  courseStepKeys,
} from "./course-catalog.js";
import {
  adjacentCourseHrefs,
  canOpenCourseStep,
  courseOutline,
  courseProgress,
} from "./course-rules.js";

type EnrollmentWithProgress = Awaited<
  ReturnType<CourseService["findEnrollment"]>
>;

@Injectable()
export class CourseService {
  constructor(private prisma: PrismaService) {}

  async list(userId: string) {
    const enrollment = await this.findCurrentEnrollment(userId);
    return [this.courseSummary(enrollment)];
  }

  async detail(userId: string, slug: string) {
    this.assertCourse(slug);
    const [enrollment, user] = await Promise.all([
      this.findCurrentEnrollment(userId),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { displayName: true },
      }),
    ]);
    const progress = courseProgress(
      enrollment?.steps.map((item) => item.stepKey) ?? [],
    );
    const greeting = enrollment
      ? progress.complete
        ? {
            title: `学完了，${user?.displayName ?? "同学"}。`,
            detail: "20 节试学内容已经完成，可以提交课程评价。",
            actionLabel: "查看结业",
          }
        : {
            title: `欢迎回来，${user?.displayName ?? "同学"}。`,
            detail: `你已经完成 ${progress.completedLessons} / 20 节。`,
            actionLabel: "继续学习",
          }
      : {
          title: `欢迎来到学习中心，${user?.displayName ?? "同学"}。`,
          detail: "从澄屿工业热能的第一条客户消息开始。",
          actionLabel: "开始学习",
        };
    return {
      ...this.courseSummary(enrollment),
      greeting,
      chapters: courseOutline(
        enrollment?.steps.map((item) => item.stepKey) ?? [],
      ),
    };
  }

  async enroll(userId: string, slug: string, input: unknown) {
    this.assertCourse(slug);
    const payload = createCourseEnrollmentSchema.parse(input);
    const enrollment = await this.prisma.courseEnrollment.upsert({
      where: {
        userId_courseSlug_courseVersion: {
          userId,
          courseSlug: courseDefinition.slug,
          courseVersion: courseDefinition.version,
        },
      },
      create: {
        userId,
        courseSlug: courseDefinition.slug,
        courseVersion: courseDefinition.version,
        idempotencyKey: payload.idempotencyKey,
      },
      update: {},
      include: { steps: true, feedback: true },
    });
    return this.serializeEnrollment(enrollment);
  }

  async enrollment(userId: string, enrollmentId: string) {
    return this.serializeEnrollment(
      await this.enrollmentOrThrow(userId, enrollmentId),
    );
  }

  async lesson(
    userId: string,
    enrollmentId: string,
    lessonKey: string,
    stepKey: string,
  ) {
    const enrollment = await this.enrollmentOrThrow(userId, enrollmentId);
    const lesson = courseLessonByKey(lessonKey);
    const step = lesson ? courseStepFor(lesson, stepKey) : undefined;
    if (!lesson || !step)
      throw new NotFoundException({
        code: "COURSE_STEP_NOT_FOUND",
        message: "课程步骤不存在",
      });
    const completedKeys = enrollment.steps.map((item) => item.stepKey);
    if (!canOpenCourseStep(stepKey, completedKeys))
      throw new ForbiddenException({
        code: "COURSE_STEP_LOCKED",
        message: "请按课程顺序完成前面的内容",
      });
    const outline = courseOutline(completedKeys);
    const lessonSummary = outline
      .flatMap((chapter) => chapter.lessons)
      .find((item) => item.key === lessonKey)!;
    return {
      course: this.courseBase(),
      enrollment: this.serializeEnrollment(enrollment),
      lesson: lessonSummary,
      chapters: outline,
      step: {
        ...step,
        completed: completedKeys.includes(stepKey),
      },
      ...adjacentCourseHrefs(stepKey),
    };
  }

  async completeStep(
    userId: string,
    enrollmentId: string,
    stepKey: string,
    input: unknown,
  ) {
    const payload = completeCourseStepSchema.parse(input);
    const enrollment = await this.enrollmentOrThrow(userId, enrollmentId);
    const index = courseStepKeys.indexOf(stepKey);
    if (index < 0)
      throw new NotFoundException({
        code: "COURSE_STEP_NOT_FOUND",
        message: "课程步骤不存在",
      });
    if (stepKey.endsWith("-practice"))
      throw new BadRequestException({
        code: "COURSE_EXERCISE_REQUIRED",
        message: "练习步骤需要提交正确答案",
      });
    const completedKeys = enrollment.steps.map((item) => item.stepKey);
    if (!canOpenCourseStep(stepKey, completedKeys))
      throw new ForbiddenException({
        code: "COURSE_STEP_LOCKED",
        message: "请按课程顺序完成前面的内容",
      });
    const operation = await this.prisma.courseStepProgress.findUnique({
      where: {
        enrollmentId_operationId: {
          enrollmentId,
          operationId: payload.operationId,
        },
      },
    });
    if (operation && operation.stepKey !== stepKey)
      throw new ConflictException({
        code: "COURSE_OPERATION_CONFLICT",
        message: "这次操作已经用于另一个课程步骤",
      });
    if (!operation) {
      const existingStep = await this.prisma.courseStepProgress.findUnique({
        where: { enrollmentId_stepKey: { enrollmentId, stepKey } },
      });
      if (existingStep)
        throw new ConflictException({
          code: "COURSE_OPERATION_CONFLICT",
          message: "该课程步骤已经由另一次操作完成",
        });
      try {
        await this.prisma.courseStepProgress.create({
          data: { enrollmentId, stepKey, operationId: payload.operationId },
        });
      } catch (error) {
        if (!(
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ))
          throw error;
        const concurrentStep = await this.prisma.courseStepProgress.findUnique({
          where: { enrollmentId_stepKey: { enrollmentId, stepKey } },
        });
        if (concurrentStep?.operationId !== payload.operationId)
          throw new ConflictException({
            code: "COURSE_OPERATION_CONFLICT",
            message: "该课程步骤已经由另一次操作完成",
          });
      }
    }
    const updated = await this.enrollmentOrThrow(userId, enrollmentId);
    return {
      enrollment: this.serializeEnrollment(updated),
      nextHref: adjacentCourseHrefs(stepKey).nextHref,
    };
  }

  async submitExercise(
    userId: string,
    enrollmentId: string,
    exerciseKey: string,
    input: unknown,
  ) {
    const payload = submitCourseExerciseSchema.parse(input);
    const enrollment = await this.enrollmentOrThrow(userId, enrollmentId);
    const lessonKey = exerciseKey.slice(0, "lesson-00".length);
    const lesson = courseLessonByKey(lessonKey);
    if (!lesson || exerciseKey !== `${lesson.key}-practice`)
      throw new NotFoundException({
        code: "COURSE_EXERCISE_NOT_FOUND",
        message: "课程练习不存在",
      });
    const completedKeys = enrollment.steps.map((item) => item.stepKey);
    if (!canOpenCourseStep(exerciseKey, completedKeys))
      throw new ForbiddenException({
        code: "COURSE_STEP_LOCKED",
        message: "请按课程顺序完成前面的内容",
      });
    let attempt = await this.prisma.courseExerciseAttempt.findUnique({
      where: {
        enrollmentId_operationId: {
          enrollmentId,
          operationId: payload.operationId,
        },
      },
    });
    if (attempt)
      this.assertExerciseOperation(
        attempt,
        exerciseKey,
        payload.selectedOptionId,
      );
    if (!attempt)
      attempt = await this.prisma.courseExerciseAttempt.findUnique({
        where: {
          enrollmentId_exerciseKey_selectedOptionId: {
            enrollmentId,
            exerciseKey,
            selectedOptionId: payload.selectedOptionId,
          },
        },
      });
    const correct = payload.selectedOptionId === lesson.correctOptionId;
    if (!attempt) {
      try {
        attempt = await this.prisma.courseExerciseAttempt.create({
          data: {
            enrollmentId,
            exerciseKey,
            selectedOptionId: payload.selectedOptionId,
            correct,
            operationId: payload.operationId,
          },
        });
      } catch (error) {
        if (!(
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ))
          throw error;
        attempt =
          (await this.prisma.courseExerciseAttempt.findUnique({
            where: {
              enrollmentId_operationId: {
                enrollmentId,
                operationId: payload.operationId,
              },
            },
          })) ??
          (await this.prisma.courseExerciseAttempt.findUnique({
            where: {
              enrollmentId_exerciseKey_selectedOptionId: {
                enrollmentId,
                exerciseKey,
                selectedOptionId: payload.selectedOptionId,
              },
            },
          }));
        if (!attempt) throw error;
        this.assertExerciseOperation(
          attempt,
          exerciseKey,
          payload.selectedOptionId,
        );
      }
    }
    if (attempt.correct) {
      await this.prisma.courseStepProgress.upsert({
        where: {
          enrollmentId_stepKey: { enrollmentId, stepKey: exerciseKey },
        },
        create: {
          enrollmentId,
          stepKey: exerciseKey,
          operationId: `exercise:${attempt.operationId}`,
        },
        update: {},
      });
    }
    await this.markCompleted(enrollmentId);
    const updated = await this.enrollmentOrThrow(userId, enrollmentId);
    return {
      correct: attempt.correct,
      selectedOptionId: attempt.selectedOptionId,
      hint: attempt.correct ? "判断正确，可以继续下一步。" : lesson.hint,
      analysis: lesson.analysis,
      optionAnalyses: lesson.options.map((option) => ({
        optionId: option.id,
        text: lesson.optionAnalyses[option.id],
      })),
      enrollment: this.serializeEnrollment(updated),
      nextHref: attempt.correct
        ? adjacentCourseHrefs(exerciseKey).nextHref
        : null,
    };
  }

  async completion(userId: string, enrollmentId: string) {
    const enrollment = await this.enrollmentOrThrow(userId, enrollmentId);
    const progress = courseProgress(
      enrollment.steps.map((item) => item.stepKey),
    );
    return {
      completed: progress.complete,
      packProfile: courseDefinition.packProfile,
      completedLessons: progress.completedLessons,
      lessonCount: 20 as const,
      feedbackSubmitted: Boolean(enrollment.feedback),
      certificate: {
        available: false,
        reason:
          "当前为试学版，完成记录会保留。正式课程发布后将按新版本规则确认结业证书。",
      },
    };
  }

  async saveFeedback(userId: string, enrollmentId: string, input: unknown) {
    const payload = saveCourseFeedbackSchema.parse(input);
    const enrollment = await this.enrollmentOrThrow(userId, enrollmentId);
    if (
      payload.mostHelpfulLessonKey &&
      !courseLessonByKey(payload.mostHelpfulLessonKey)
    )
      throw new BadRequestException({
        code: "COURSE_LESSON_NOT_FOUND",
        message: "最有帮助的小节不存在",
      });
    if (!courseProgress(enrollment.steps.map((item) => item.stepKey)).complete)
      throw new ForbiddenException({
        code: "COURSE_NOT_COMPLETED",
        message: "完成 20 节后可以提交课程评价",
      });
    await this.prisma.courseFeedback.upsert({
      where: { enrollmentId },
      create: { enrollmentId, ...payload },
      update: payload,
      select: {
        usefulness: true,
        clarity: true,
        difficulty: true,
        recommendation: true,
        mostHelpfulLessonKey: true,
        comment: true,
        updatedAt: true,
      },
    });
    return this.completion(userId, enrollmentId);
  }

  private assertCourse(slug: string) {
    if (slug !== courseDefinition.slug)
      throw new NotFoundException({
        code: "COURSE_NOT_FOUND",
        message: "课程不存在",
      });
  }

  private assertExerciseOperation(
    attempt: { exerciseKey: string; selectedOptionId: string },
    exerciseKey: string,
    selectedOptionId: string,
  ) {
    if (
      attempt.exerciseKey !== exerciseKey ||
      attempt.selectedOptionId !== selectedOptionId
    )
      throw new ConflictException({
        code: "COURSE_OPERATION_CONFLICT",
        message: "这次操作对应的练习或答案已经变化",
      });
  }

  private findCurrentEnrollment(userId: string) {
    return this.prisma.courseEnrollment.findUnique({
      where: {
        userId_courseSlug_courseVersion: {
          userId,
          courseSlug: courseDefinition.slug,
          courseVersion: courseDefinition.version,
        },
      },
      include: { steps: true, feedback: true },
    });
  }

  private findEnrollment(userId: string, id: string) {
    return this.prisma.courseEnrollment.findFirst({
      where: { id, userId },
      include: { steps: true, feedback: true },
    });
  }

  private async enrollmentOrThrow(userId: string, id: string) {
    const enrollment = await this.findEnrollment(userId, id);
    if (!enrollment)
      throw new NotFoundException({
        code: "COURSE_ENROLLMENT_NOT_FOUND",
        message: "学习记录不存在",
      });
    if (
      enrollment.courseSlug !== courseDefinition.slug ||
      enrollment.courseVersion !== courseDefinition.version
    )
      throw new ConflictException({
        code: "COURSE_VERSION_UNAVAILABLE",
        message: "该学习记录对应的课程版本当前不可用",
      });
    return enrollment;
  }

  private async markCompleted(enrollmentId: string) {
    const count = await this.prisma.courseStepProgress.count({
      where: { enrollmentId, stepKey: { in: courseStepKeys } },
    });
    if (count !== courseStepKeys.length) return;
    await this.prisma.courseEnrollment.updateMany({
      where: { id: enrollmentId, status: "IN_PROGRESS" },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
  }

  private courseSummary(enrollment: EnrollmentWithProgress) {
    return {
      ...this.courseBase(),
      enrollment: enrollment ? this.serializeEnrollment(enrollment) : null,
    };
  }

  private courseBase() {
    return {
      ...courseDefinition,
      lessonCount: 20 as const,
    };
  }

  private serializeEnrollment(enrollment: NonNullable<EnrollmentWithProgress>) {
    const progress = courseProgress(
      enrollment.steps.map((item) => item.stepKey),
    );
    return {
      id: enrollment.id,
      courseSlug: courseDefinition.slug,
      courseVersion: enrollment.courseVersion,
      status: progress.complete
        ? ("COMPLETED" as const)
        : ("IN_PROGRESS" as const),
      completedSteps: progress.completedSteps,
      totalSteps: 60 as const,
      completedLessons: progress.completedLessons,
      progressPercent: progress.progressPercent,
      currentLessonKey: progress.currentLessonKey,
      currentStepKey: progress.currentStepKey,
      continueHref: progress.continueHref,
      startedAt: enrollment.startedAt.toISOString(),
      completedAt: enrollment.completedAt?.toISOString() ?? null,
    };
  }
}
