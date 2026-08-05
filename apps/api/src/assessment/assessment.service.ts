import { createHash, randomUUID } from "node:crypto";
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  GoneException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  assessmentReportPayloadSchema,
  assessmentGateApprovalSchema,
  createAssessmentAttemptSchema,
  grantAssessmentPilotParticipantSchema,
  saveAssessmentAnswerSchema,
  voidAssessmentAttemptSchema,
} from "@orosaga/contracts";
import { PrismaService } from "../prisma/prisma.service.js";
import { buildAssessmentReport } from "./assessment-report.js";
import { buildAssessmentQuality } from "./assessment-quality.js";
import {
  capAnswerActiveDuration,
  calculateQuotaDate,
  effectiveSourceReviewStatus,
  evaluateAssessmentEligibility,
  nextShanghaiDay,
  scoreAssessment,
  shouldGenerateAssessmentReport,
} from "./assessment-rules.js";

type OptionId = "a" | "b" | "c" | "d";
type PublicOption = { id: OptionId; text: string };
type AttemptManifest = {
  questions: Array<{ questionId: string; optionOrder: OptionId[] }>;
};
type PilotParticipantWithVersion = Prisma.AssessmentPilotParticipantGetPayload<{
  include: {
    version: {
      include: { cycle: { include: { assessment: true } }; questions: true };
    };
  };
}>;

const asObject = (value: Prisma.JsonValue | null | undefined) =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, Prisma.JsonValue>)
    : {};

const asStringArray = (value: Prisma.JsonValue | null | undefined) =>
  Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];

const asPublicOptions = (value: Prisma.JsonValue): PublicOption[] => {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) return [];
    const option = item as Record<string, Prisma.JsonValue>;
    return typeof option.id === "string" && typeof option.text === "string"
      ? [{ id: option.id as OptionId, text: option.text }]
      : [];
  });
};

const asManifest = (value: Prisma.JsonValue): AttemptManifest => {
  const raw = asObject(value).questions;
  if (!Array.isArray(raw)) return { questions: [] };
  return {
    questions: raw.flatMap((item) => {
      if (!item || typeof item !== "object" || Array.isArray(item)) return [];
      const row = item as Record<string, Prisma.JsonValue>;
      if (typeof row.questionId !== "string" || !Array.isArray(row.optionOrder))
        return [];
      return [
        {
          questionId: row.questionId,
          optionOrder: row.optionOrder.filter(
            (option): option is OptionId =>
              typeof option === "string" &&
              ["a", "b", "c", "d"].includes(option),
          ),
        },
      ];
    }),
  };
};

const deterministicOrder = <T>(
  values: T[],
  seed: string,
  keyOf: (value: T) => string,
) =>
  [...values].sort((a, b) => {
    const rank = (value: T) =>
      createHash("sha256")
        .update(`${seed}:${keyOf(value)}`)
        .digest("hex");
    return rank(a).localeCompare(rank(b));
  });

const attemptResponse = (attempt: {
  id: string;
  status: "IN_PROGRESS" | "SUBMITTED" | "EXPIRED" | "VOIDED";
  kind: "FORMAL" | "PILOT";
  attemptNumber: number;
  startedAt: Date;
  deadlineAt: Date;
  submittedAt: Date | null;
  score: number | null;
  answeredCount: number;
  manifest: Prisma.JsonValue;
  version: { version: string };
  answers: unknown[];
}) => ({
  id: attempt.id,
  status: attempt.status,
  kind: attempt.kind,
  attemptNumber: attempt.attemptNumber,
  startedAt: attempt.startedAt.toISOString(),
  deadlineAt: attempt.deadlineAt.toISOString(),
  submittedAt: attempt.submittedAt?.toISOString() ?? null,
  answeredCount: Math.max(attempt.answeredCount, attempt.answers.length),
  questionCount: asManifest(attempt.manifest).questions.length,
  score: attempt.score,
  version: attempt.version.version,
});

@Injectable()
export class AssessmentService {
  constructor(private prisma: PrismaService) {}

  private async publishedContext(slug: string, now = new Date()) {
    const assessment = await this.prisma.assessment.findUnique({
      where: { slug },
      include: {
        cycles: {
          where: {
            status: "ACTIVE",
            startsAt: { lte: now },
            OR: [{ endsAt: null }, { endsAt: { gt: now } }],
            versions: { some: { status: "PUBLISHED" } },
          },
          orderBy: { startsAt: "desc" },
          take: 1,
          include: {
            versions: {
              where: { status: "PUBLISHED" },
              orderBy: { publishedAt: "desc" },
              take: 1,
            },
          },
        },
      },
    });
    return {
      assessment,
      cycle: assessment?.cycles[0] ?? null,
      version: assessment?.cycles[0]?.versions[0] ?? null,
    };
  }

  private async pilotContext(slug: string, userId: string, now: Date) {
    const participant = await this.prisma.assessmentPilotParticipant.findFirst({
      where: {
        userId,
        revokedAt: null,
        version: { status: "VALIDATED", cycle: { assessment: { slug } } },
      },
      orderBy: { createdAt: "desc" },
      include: {
        version: { include: { cycle: { include: { assessment: true } } } },
      },
    });
    const version = participant?.version;
    if (
      !participant ||
      !version ||
      version.contentReviewStatus !== "APPROVED" ||
      version.angoffStatus !== "APPROVED" ||
      effectiveSourceReviewStatus(
        version.sourceReviewStatus,
        version.reviewDueAt,
        now,
      ) !== "CURRENT"
    )
      return null;
    return {
      participant,
      version,
      cycle: version.cycle,
      assessment: version.cycle.assessment,
    };
  }

  private async pilotOverview(
    context: NonNullable<
      Awaited<ReturnType<AssessmentService["pilotContext"]>>
    >,
    userId: string,
    now: Date,
  ): Promise<Record<string, unknown>> {
    const attempts = await this.prisma.assessmentAttempt.findMany({
      where: { userId, versionId: context.version.id, kind: "PILOT" },
      orderBy: { createdAt: "asc" },
      include: { version: true, answers: true },
    });
    const active = attempts.find((attempt) => attempt.status === "IN_PROGRESS");
    if (active && active.deadlineAt <= now) {
      await this.finalizeAttempt(active.id, userId, now);
      return this.pilotOverview(context, userId, now);
    }
    const completed = attempts.filter(
      (attempt) =>
        attempt.status === "SUBMITTED" || attempt.status === "EXPIRED",
    );
    const latest = completed.at(-1) ?? null;
    return {
      assessmentSlug: context.assessment.slug,
      title: context.assessment.title,
      enabled: false,
      mode: "PILOT" as const,
      status: active
        ? "IN_PROGRESS"
        : completed.length || context.version.pilotStatus !== "PENDING_HUMAN"
          ? "UNAVAILABLE"
          : "AVAILABLE",
      cycleKey: context.cycle.cycleKey,
      version: context.version.version,
      dailyLimit: 1,
      maxAttempts: 1,
      attemptsUsed: completed.length,
      attemptsRemaining: completed.length ? 0 : 1,
      attemptedToday: false,
      nextEligibleAt: null,
      activeAttemptId: active?.id ?? null,
      activeDeadlineAt: active?.deadlineAt.toISOString() ?? null,
      latestScore: latest?.score ?? null,
      bestScore: latest?.score ?? null,
      passed: false,
      passScore: context.version.passScore,
      history: completed.map((attempt) => attemptResponse(attempt)),
    };
  }

  async overview(
    slug: string,
    userId: string,
  ): Promise<Record<string, unknown>> {
    const now = new Date();
    const pilot = await this.pilotContext(slug, userId, now);
    if (pilot) return this.pilotOverview(pilot, userId, now);
    const context = await this.publishedContext(slug, now);
    if (!context.assessment)
      throw new NotFoundException({
        code: "ASSESSMENT_NOT_FOUND",
        message: "测评不存在",
      });
    if (!context.cycle || !context.version)
      return {
        assessmentSlug: slug,
        title: context.assessment.title,
        enabled: context.assessment.enabled,
        mode: null,
        status: "UNAVAILABLE",
        cycleKey: null,
        version: null,
        dailyLimit: 1,
        maxAttempts: 3,
        attemptsUsed: 0,
        attemptsRemaining: 0,
        attemptedToday: false,
        nextEligibleAt: null,
        activeAttemptId: null,
        activeDeadlineAt: null,
        latestScore: null,
        bestScore: null,
        passed: false,
        passScore: null,
        history: [],
      };

    const attempts = await this.prisma.assessmentAttempt.findMany({
      where: { userId, cycleId: context.cycle.id, kind: "FORMAL" },
      orderBy: { attemptNumber: "asc" },
      include: { version: true, answers: true },
    });
    const activeAcrossCycles = await this.prisma.assessmentAttempt.findFirst({
      where: {
        userId,
        assessmentId: context.assessment.id,
        status: "IN_PROGRESS",
      },
      include: { version: true, answers: true },
    });
    const expiredActive =
      activeAcrossCycles && activeAcrossCycles.deadlineAt <= now
        ? activeAcrossCycles
        : null;
    if (expiredActive) {
      await this.finalizeAttempt(expiredActive.id, userId, now);
      return this.overview(slug, userId);
    }
    const effective = attempts.filter((attempt) => attempt.status !== "VOIDED");
    const quotaDate = calculateQuotaDate(now);
    const attemptedToday =
      (await this.prisma.assessmentAttempt.count({
        where: {
          userId,
          assessmentId: context.assessment.id,
          kind: "FORMAL",
          quotaDate: new Date(`${quotaDate}T00:00:00.000Z`),
          status: { not: "VOIDED" },
        },
      })) > 0;
    const active = activeAcrossCycles;
    const eligibility = evaluateAssessmentEligibility({
      enabled: context.assessment.enabled,
      sourceReviewStatus: effectiveSourceReviewStatus(
        context.version.sourceReviewStatus,
        context.version.reviewDueAt,
        now,
      ),
      attemptsUsed: effective.length,
      attemptedToday,
      dailyLimit: context.cycle.dailyLimit,
      maxAttempts: context.cycle.maxAttempts,
      activeAttempt: active
        ? { id: active.id, deadlineAt: active.deadlineAt }
        : null,
    });
    const completed = effective.filter(
      (attempt) =>
        attempt.status === "SUBMITTED" || attempt.status === "EXPIRED",
    );
    const latest = completed.at(-1) ?? null;
    const bestScore = completed.length
      ? Math.max(...completed.map((attempt) => attempt.score ?? 0))
      : null;
    return {
      assessmentSlug: slug,
      title: context.assessment.title,
      enabled: context.assessment.enabled,
      status: eligibility.status,
      cycleKey: context.cycle.cycleKey,
      version: context.version.version,
      dailyLimit: context.cycle.dailyLimit,
      maxAttempts: context.cycle.maxAttempts,
      attemptsUsed: effective.length,
      attemptsRemaining: eligibility.attemptsRemaining,
      attemptedToday,
      nextEligibleAt:
        eligibility.status === "DAILY_LIMIT_REACHED"
          ? nextShanghaiDay(quotaDate)
          : null,
      activeAttemptId: eligibility.activeAttemptId,
      activeDeadlineAt: eligibility.activeDeadlineAt,
      latestScore: latest?.score ?? null,
      bestScore,
      passed: completed.some(
        (attempt) =>
          attempt.score !== null && attempt.score >= attempt.version.passScore,
      ),
      passScore: context.version.passScore,
      history: completed.map((attempt) => attemptResponse(attempt)),
    };
  }

  private async createPilotAttemptInTransaction(
    tx: Prisma.TransactionClient,
    participant: PilotParticipantWithVersion,
    userId: string,
    idempotencyKey: string,
    now: Date,
  ) {
    const version = participant.version;
    if (
      participant.revokedAt ||
      version.status !== "VALIDATED" ||
      version.pilotStatus !== "PENDING_HUMAN" ||
      version.contentReviewStatus !== "APPROVED" ||
      version.angoffStatus !== "APPROVED" ||
      effectiveSourceReviewStatus(
        version.sourceReviewStatus,
        version.reviewDueAt,
        now,
      ) !== "CURRENT"
    )
      throw new ServiceUnavailableException({
        code: "ASSESSMENT_UNAVAILABLE",
        message: "受控试测当前未开放",
      });
    const existingPilot = await tx.assessmentAttempt.findFirst({
      where: { userId, versionId: version.id, kind: "PILOT" },
      include: { version: true, answers: true },
    });
    if (existingPilot?.status === "IN_PROGRESS")
      throw new ConflictException({
        code: "ATTEMPT_ALREADY_ACTIVE",
        message: "已有进行中的试测",
      });
    if (existingPilot)
      throw new ForbiddenException({
        code: "PILOT_ATTEMPT_COMPLETED",
        message: "当前题库版本的试测已经完成",
      });
    const active = await tx.assessmentAttempt.findFirst({
      where: {
        userId,
        assessmentId: version.cycle.assessmentId,
        status: "IN_PROGRESS",
      },
      select: { id: true, deadlineAt: true },
    });
    if (active && active.deadlineAt > now)
      throw new ConflictException({
        code: "ATTEMPT_ALREADY_ACTIVE",
        message: "已有进行中的考试",
      });
    if (active)
      await this.finalizeAttemptInTransaction(tx, active.id, userId, now);
    if (version.questions.length !== version.questionCount)
      throw new ServiceUnavailableException({
        code: "ASSESSMENT_VERSION_INVALID",
        message: "题库版本未准备完成",
      });
    const attemptId = randomUUID();
    const questions = deterministicOrder(
      version.questions,
      `${attemptId}:questions`,
      (question) => question.id,
    );
    const manifest: AttemptManifest = {
      questions: questions.map((question) => ({
        questionId: question.id,
        optionOrder: deterministicOrder(
          asPublicOptions(question.options).map((option) => option.id),
          `${attemptId}:${question.id}:options`,
          (option) => option,
        ),
      })),
    };
    const quotaDate = new Date(`${calculateQuotaDate(now)}T00:00:00.000Z`);
    const created = await tx.assessmentAttempt.create({
      data: {
        id: attemptId,
        userId,
        assessmentId: version.cycle.assessmentId,
        cycleId: version.cycleId,
        versionId: version.id,
        idempotencyKey,
        attemptNumber: 1,
        quotaDate,
        kind: "PILOT",
        manifest: manifest as unknown as Prisma.InputJsonValue,
        startedAt: now,
        deadlineAt: new Date(now.getTime() + version.durationMinutes * 60_000),
      },
      include: { version: true, answers: true },
    });
    return attemptResponse(created);
  }

  async createAttempt(slug: string, input: unknown, userId: string) {
    const data = createAssessmentAttemptSchema.parse(input);
    const existing = await this.prisma.assessmentAttempt.findUnique({
      where: {
        userId_idempotencyKey: { userId, idempotencyKey: data.idempotencyKey },
      },
      include: { version: true, answers: true },
    });
    if (existing) return attemptResponse(existing);

    try {
      return await this.prisma.$transaction(
        async (tx) => {
          await tx.$executeRaw(
            Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${`assessment:${userId}:${slug}`}, 0))`,
          );
          const repeated = await tx.assessmentAttempt.findUnique({
            where: {
              userId_idempotencyKey: {
                userId,
                idempotencyKey: data.idempotencyKey,
              },
            },
            include: { version: true, answers: true },
          });
          if (repeated) return attemptResponse(repeated);
          const now = new Date();
          const pilotParticipant =
            await tx.assessmentPilotParticipant.findFirst({
              where: {
                userId,
                revokedAt: null,
                version: {
                  status: "VALIDATED",
                  cycle: { assessment: { slug } },
                },
              },
              orderBy: { createdAt: "desc" },
              include: {
                version: {
                  include: {
                    cycle: { include: { assessment: true } },
                    questions: { orderBy: { position: "asc" } },
                  },
                },
              },
            });
          if (pilotParticipant)
            return this.createPilotAttemptInTransaction(
              tx,
              pilotParticipant,
              userId,
              data.idempotencyKey,
              now,
            );
          const assessment = await tx.assessment.findUnique({
            where: { slug },
            include: {
              cycles: {
                where: {
                  status: "ACTIVE",
                  startsAt: { lte: now },
                  OR: [{ endsAt: null }, { endsAt: { gt: now } }],
                  versions: { some: { status: "PUBLISHED" } },
                },
                orderBy: { startsAt: "desc" },
                take: 1,
                include: {
                  versions: {
                    where: { status: "PUBLISHED" },
                    orderBy: { publishedAt: "desc" },
                    take: 1,
                    include: { questions: { orderBy: { position: "asc" } } },
                  },
                },
              },
            },
          });
          const cycle = assessment?.cycles[0];
          const version = cycle?.versions[0];
          if (!assessment || !cycle || !version || !assessment.enabled)
            throw new ServiceUnavailableException({
              code: "ASSESSMENT_UNAVAILABLE",
              message: "测评当前未开放",
            });
          if (
            effectiveSourceReviewStatus(
              version.sourceReviewStatus,
              version.reviewDueAt,
              now,
            ) !== "CURRENT"
          )
            throw new ServiceUnavailableException({
              code: "ASSESSMENT_REVIEW_REQUIRED",
              message: "测评内容正在复核",
            });
          const allAttempts = await tx.assessmentAttempt.findMany({
            where: { userId, cycleId: cycle.id, kind: "FORMAL" },
          });
          const attempts = allAttempts.filter(
            (attempt) => attempt.status !== "VOIDED",
          );
          const activeAttempt = await tx.assessmentAttempt.findFirst({
            where: {
              userId,
              assessmentId: assessment.id,
              status: "IN_PROGRESS",
            },
            select: { id: true, deadlineAt: true },
          });
          if (activeAttempt && activeAttempt.deadlineAt <= now)
            await this.finalizeAttemptInTransaction(
              tx,
              activeAttempt.id,
              userId,
              now,
            );
          if (activeAttempt && activeAttempt.deadlineAt > now)
            throw new ConflictException({
              code: "ATTEMPT_ALREADY_ACTIVE",
              message: "已有进行中的考试",
            });
          if (attempts.length >= cycle.maxAttempts)
            throw new ForbiddenException({
              code: "ATTEMPT_LIMIT_REACHED",
              message: "本周期考试次数已用完",
            });
          const quotaDateString = calculateQuotaDate(now);
          const quotaDate = new Date(`${quotaDateString}T00:00:00.000Z`);
          if (
            (await tx.assessmentAttempt.count({
              where: {
                userId,
                assessmentId: assessment.id,
                quotaDate,
                kind: "FORMAL",
                status: { not: "VOIDED" },
              },
            })) >= cycle.dailyLimit
          )
            throw new ForbiddenException({
              code: "DAILY_LIMIT_REACHED",
              message: "今天已经参加过考试",
            });
          if (version.questions.length !== version.questionCount)
            throw new ServiceUnavailableException({
              code: "ASSESSMENT_VERSION_INVALID",
              message: "题库版本未准备完成",
            });

          const attemptId = randomUUID();
          const orderedQuestions = deterministicOrder(
            version.questions,
            `${attemptId}:questions`,
            (question) => question.id,
          );
          const manifest: AttemptManifest = {
            questions: orderedQuestions.map((question) => ({
              questionId: question.id,
              optionOrder: deterministicOrder(
                asPublicOptions(question.options).map((option) => option.id),
                `${attemptId}:${question.id}:options`,
                (option) => option,
              ),
            })),
          };
          const deadlineAt = new Date(
            now.getTime() + version.durationMinutes * 60_000,
          );
          const created = await tx.assessmentAttempt.create({
            data: {
              id: attemptId,
              userId,
              assessmentId: assessment.id,
              cycleId: cycle.id,
              versionId: version.id,
              idempotencyKey: data.idempotencyKey,
              attemptNumber:
                Math.max(
                  0,
                  ...attempts.map((attempt) => attempt.attemptNumber),
                ) + 1,
              quotaDate,
              kind: "FORMAL",
              manifest: manifest as unknown as Prisma.InputJsonValue,
              startedAt: now,
              deadlineAt,
            },
            include: { version: true, answers: true },
          });
          return attemptResponse(created);
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
        throw new ConflictException({
          code: "ATTEMPT_QUOTA_CONFLICT",
          message: "考试资格已被另一请求使用，请刷新后继续",
        });
      throw error;
    }
  }

  private async ownedAttempt(id: string, userId: string) {
    const attempt = await this.prisma.assessmentAttempt.findFirst({
      where: { id, userId },
      include: {
        version: true,
        assessment: true,
        answers: true,
        override: true,
      },
    });
    if (!attempt)
      throw new NotFoundException({
        code: "ATTEMPT_NOT_FOUND",
        message: "考试不存在",
      });
    return attempt;
  }

  async attempt(id: string, userId: string) {
    let attempt = await this.ownedAttempt(id, userId);
    if (attempt.status === "IN_PROGRESS" && attempt.deadlineAt <= new Date()) {
      await this.finalizeAttempt(id, userId, new Date());
      attempt = await this.ownedAttempt(id, userId);
    }
    return {
      ...attemptResponse(attempt),
      assessmentSlug: attempt.assessment.slug,
      title: attempt.assessment.title,
      passScore: attempt.version.passScore,
    };
  }

  async question(id: string, position: number, userId: string) {
    let attempt = await this.ownedAttempt(id, userId);
    if (attempt.status === "IN_PROGRESS" && attempt.deadlineAt <= new Date()) {
      await this.finalizeAttempt(id, userId, new Date());
      attempt = await this.ownedAttempt(id, userId);
    }
    if (attempt.status !== "IN_PROGRESS")
      throw new GoneException({
        code: "ATTEMPT_CLOSED",
        message: "考试已经结束",
      });
    const entry = asManifest(attempt.manifest).questions[position - 1];
    if (!entry)
      throw new NotFoundException({
        code: "QUESTION_NOT_FOUND",
        message: "题目不存在",
      });
    const question = await this.prisma.assessmentQuestion.findFirst({
      where: { id: entry.questionId, versionId: attempt.versionId },
    });
    if (!question)
      throw new NotFoundException({
        code: "QUESTION_NOT_FOUND",
        message: "题目不存在",
      });
    const answer = attempt.answers.find(
      (item) => item.questionId === question.id,
    );
    const options = asPublicOptions(question.options);
    const optionMap = new Map(options.map((option) => [option.id, option]));
    return {
      id: question.id,
      stableKey: question.stableKey,
      position,
      primaryDimension: question.primaryDimension,
      difficulty: question.difficulty,
      stem: question.stem,
      options: entry.optionOrder.flatMap((option) => {
        const value = optionMap.get(option);
        return value ? [value] : [];
      }),
      selectedOptionId:
        (answer?.selectedOptionId as OptionId | undefined) ?? null,
      answerRevision: answer?.revision ?? 0,
    };
  }

  async review(id: string, userId: string) {
    let attempt = await this.ownedAttempt(id, userId);
    if (attempt.status === "IN_PROGRESS" && attempt.deadlineAt <= new Date()) {
      await this.finalizeAttempt(id, userId, new Date());
      attempt = await this.ownedAttempt(id, userId);
    }
    const answered = new Set(
      attempt.answers.map((answer) => answer.questionId),
    );
    return {
      attempt: attemptResponse(attempt),
      items: asManifest(attempt.manifest).questions.map((question, index) => ({
        questionId: question.questionId,
        position: index + 1,
        answered: answered.has(question.questionId),
      })),
    };
  }

  async saveAnswer(
    id: string,
    questionId: string,
    input: unknown,
    userId: string,
  ) {
    const data = saveAssessmentAnswerSchema.parse(input);
    return this.prisma.$transaction(async (tx) => {
      await tx.$queryRaw(
        Prisma.sql`SELECT "id" FROM "assessment_attempts" WHERE "id" = ${id}::uuid FOR UPDATE`,
      );
      const attempt = await tx.assessmentAttempt.findFirst({
        where: { id, userId },
        include: { answers: true },
      });
      if (!attempt)
        throw new NotFoundException({
          code: "ATTEMPT_NOT_FOUND",
          message: "考试不存在",
        });
      if (attempt.status !== "IN_PROGRESS" || attempt.deadlineAt <= new Date())
        throw new GoneException({
          code: "ATTEMPT_CLOSED",
          message: "考试已经结束",
        });
      const manifestEntry = asManifest(attempt.manifest).questions.find(
        (entry) => entry.questionId === questionId,
      );
      if (
        !manifestEntry ||
        !manifestEntry.optionOrder.includes(data.selectedOptionId)
      )
        throw new BadRequestException({
          code: "QUESTION_OPTION_INVALID",
          message: "题目或选项无效",
        });
      const current = attempt.answers.find(
        (answer) => answer.questionId === questionId,
      );
      const recordedTotalMs = attempt.answers.reduce(
        (total, answer) => total + answer.activeDurationMs,
        0,
      );
      const attemptBudgetMs = Math.max(
        0,
        attempt.deadlineAt.getTime() - attempt.startedAt.getTime(),
      );
      if (!current) {
        if (data.revision !== 0)
          throw new ConflictException({
            code: "ANSWER_VERSION_CONFLICT",
            message: "答案已在其他设备更新",
          });
        const saved = await tx.assessmentAnswer.create({
          data: {
            attemptId: id,
            questionId,
            firstOptionId: data.selectedOptionId,
            selectedOptionId: data.selectedOptionId,
            displayOrder: manifestEntry.optionOrder,
            revision: 1,
            activeDurationMs: capAnswerActiveDuration(
              0,
              data.activeDurationMs,
              recordedTotalMs,
              attemptBudgetMs,
            ),
          },
        });
        await tx.assessmentAttempt.update({
          where: { id },
          data: { answeredCount: attempt.answers.length + 1 },
        });
        return {
          questionId,
          selectedOptionId: saved.selectedOptionId,
          revision: saved.revision,
          changeCount: saved.changeCount,
          answeredCount: attempt.answers.length + 1,
        };
      }
      if (current.revision !== data.revision)
        throw new ConflictException({
          code: "ANSWER_VERSION_CONFLICT",
          message: "答案已在其他设备更新",
        });
      const changed = current.selectedOptionId !== data.selectedOptionId;
      const updated = await tx.assessmentAnswer.update({
        where: { id: current.id },
        data: {
          selectedOptionId: data.selectedOptionId,
          revision: { increment: 1 },
          ...(changed ? { changeCount: { increment: 1 } } : {}),
          activeDurationMs: capAnswerActiveDuration(
            current.activeDurationMs,
            data.activeDurationMs,
            recordedTotalMs,
            attemptBudgetMs,
          ),
          answeredAt: new Date(),
        },
      });
      return {
        questionId,
        selectedOptionId: updated.selectedOptionId,
        revision: updated.revision,
        changeCount: updated.changeCount,
        answeredCount: attempt.answers.length,
      };
    });
  }

  async submit(id: string, userId: string) {
    const result = await this.finalizeAttempt(id, userId, new Date());
    await this.generateReport(id);
    return result;
  }

  private async finalizeAttempt(id: string, userId: string, now: Date) {
    return this.prisma.$transaction(
      (tx) => this.finalizeAttemptInTransaction(tx, id, userId, now),
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  private async finalizeAttemptInTransaction(
    tx: Prisma.TransactionClient,
    id: string,
    userId: string,
    now: Date,
  ) {
    await tx.$queryRaw(
      Prisma.sql`SELECT "id" FROM "assessment_attempts" WHERE "id" = ${id}::uuid FOR UPDATE`,
    );
    const attempt = await tx.assessmentAttempt.findFirst({
      where: { id, userId },
      include: { version: true, answers: true },
    });
    if (!attempt)
      throw new NotFoundException({
        code: "ATTEMPT_NOT_FOUND",
        message: "考试不存在",
      });
    if (attempt.status === "VOIDED")
      throw new GoneException({
        code: "ATTEMPT_VOIDED",
        message: "考试已作废",
      });
    if (attempt.status === "SUBMITTED" || attempt.status === "EXPIRED")
      return attemptResponse(attempt);
    const manifest = asManifest(attempt.manifest);
    const keys = await tx.assessmentQuestionKey.findMany({
      where: { question: { versionId: attempt.versionId } },
    });
    if (keys.length !== manifest.questions.length)
      throw new ServiceUnavailableException({
        code: "ASSESSMENT_KEY_INCOMPLETE",
        message: "评分暂时不可用",
      });
    const scored = scoreAssessment(
      keys.map((key) => ({
        questionId: key.questionId,
        correctOptionId: key.correctOptionId,
      })),
      attempt.answers.map((answer) => ({
        questionId: answer.questionId,
        selectedOptionId: answer.selectedOptionId,
      })),
    );
    for (const item of scored.results)
      await tx.assessmentAnswer.updateMany({
        where: { attemptId: id, questionId: item.questionId },
        data: { isCorrect: item.isCorrect },
      });
    const status = now >= attempt.deadlineAt ? "EXPIRED" : "SUBMITTED";
    const completed = await tx.assessmentAttempt.update({
      where: { id },
      data: {
        status,
        score: scored.score,
        submittedAt: now,
        answeredCount: attempt.answers.length,
      },
      include: { version: true, answers: true },
    });
    await tx.assessmentReport.upsert({
      where: { attemptId: id },
      create: { attemptId: id, reportVersion: "1.0.0", status: "PENDING" },
      update: {},
    });
    return attemptResponse(completed);
  }

  private async generateReport(attemptId: string) {
    const report = await this.prisma.assessmentReport.findUnique({
      where: { attemptId },
    });
    if (!report || report.status === "READY") return report;
    try {
      const attempt = await this.prisma.assessmentAttempt.findUnique({
        where: { id: attemptId },
        include: {
          answers: true,
          version: {
            include: {
              questions: {
                include: { key: true, sources: true },
              },
            },
          },
        },
      });
      if (!attempt || !attempt.submittedAt || attempt.score === null)
        throw new Error("attempt is not finalized");
      const answerMap = new Map(
        attempt.answers.map((answer) => [answer.questionId, answer]),
      );
      const manifest = asManifest(attempt.manifest);
      const questionMap = new Map(
        attempt.version.questions.map((question) => [question.id, question]),
      );
      const previous = await this.prisma.assessmentAttempt.findMany({
        where: {
          userId: attempt.userId,
          cycleId: attempt.cycleId,
          kind: attempt.kind,
          status: { in: ["SUBMITTED", "EXPIRED"] },
          attemptNumber: { lt: attempt.attemptNumber },
        },
        orderBy: { attemptNumber: "asc" },
        include: { report: true },
      });
      const previousAttempts = previous.flatMap((item) => {
        const payload = item.report?.payload;
        const parsed = assessmentReportPayloadSchema.safeParse(payload);
        if (!item.submittedAt || item.score === null) return [];
        return [
          {
            attemptNumber: item.attemptNumber,
            score: item.score,
            submittedAt: item.submittedAt.toISOString(),
            dimensionScores: parsed.success
              ? Object.fromEntries(
                  parsed.data.dimensions.map((dimension) => [
                    dimension.key,
                    Math.round(dimension.accuracy * 100),
                  ]),
                )
              : {},
          },
        ];
      });
      const payload = buildAssessmentReport({
        generatedAt: new Date(),
        passScore: attempt.version.passScore,
        attemptNumber: attempt.attemptNumber,
        submittedAt: attempt.submittedAt,
        previousAttempts,
        questions: manifest.questions.map((entry, index) => {
          const question = questionMap.get(entry.questionId);
          if (!question?.key) throw new Error("question key is missing");
          const answer = answerMap.get(entry.questionId);
          const storedOptions = asPublicOptions(question.options);
          const optionMap = new Map(
            storedOptions.map((option) => [option.id, option]),
          );
          const options = entry.optionOrder.flatMap((optionId) => {
            const option = optionMap.get(optionId);
            return option ? [option] : [];
          });
          if (options.length !== storedOptions.length)
            throw new Error("attempt option order is incomplete");
          const rationales = asObject(question.key.optionRationales);
          const misconceptions = asObject(question.key.misconceptions);
          const labels = asObject(question.key.misconceptionLabels);
          return {
            questionId: question.id,
            stableKey: question.stableKey,
            position: index + 1,
            primaryDimension: question.primaryDimension as
              "D1" | "D2" | "D3" | "D4" | "D5",
            sourceType: question.sourceType as "PAPER" | "DATA" | "BUSINESS",
            difficulty: question.difficulty as "L1" | "L2" | "L3",
            topic: question.topic,
            deliveryStages: asStringArray(question.deliveryStages),
            businessImportance: question.businessImportance,
            stem: question.stem,
            options,
            correctOptionId: question.key.correctOptionId as OptionId,
            optionRationales: Object.fromEntries(
              options.map((option) => [
                option.id,
                typeof rationales[option.id] === "string"
                  ? rationales[option.id]
                  : "暂无解析",
              ]),
            ) as Record<OptionId, string>,
            misconceptions: Object.fromEntries(
              options.map((option) => [
                option.id,
                typeof misconceptions[option.id] === "string"
                  ? misconceptions[option.id]
                  : null,
              ]),
            ) as Record<OptionId, string | null>,
            misconceptionLabels: Object.fromEntries(
              Object.entries(labels).flatMap(([key, value]) =>
                typeof value === "string" ? [[key, value]] : [],
              ),
            ),
            coreRationale: question.key.coreRationale,
            reasoningSteps: asStringArray(question.key.reasoningSteps),
            businessApplication: question.key.businessApplication,
            sourceIds: question.sources.map((source) => source.sourceId),
            learningPaths: asStringArray(question.key.learningPaths),
            selectedOptionId:
              (answer?.selectedOptionId as OptionId | undefined) ?? null,
            activeDurationMs: answer?.activeDurationMs ?? 0,
            changeCount: answer?.changeCount ?? 0,
          };
        }),
      });
      assessmentReportPayloadSchema.parse(payload);
      await this.prisma.assessmentReport.updateMany({
        where: {
          attemptId,
          attempt: { status: { not: "VOIDED" } },
          OR: [
            { failureCode: null },
            {
              failureCode: {
                notIn: ["DETAIL_RETENTION_EXPIRED", "ATTEMPT_VOIDED_SENSITIVE"],
              },
            },
          ],
        },
        data: {
          status: "READY",
          payload: payload as unknown as Prisma.InputJsonValue,
          generatedAt: new Date(payload.generatedAt),
          failureCode: null,
        },
      });
      return this.prisma.assessmentReport.findUnique({ where: { attemptId } });
    } catch {
      await this.prisma.assessmentReport.updateMany({
        where: {
          attemptId,
          OR: [
            { failureCode: null },
            {
              failureCode: {
                notIn: ["DETAIL_RETENTION_EXPIRED", "ATTEMPT_VOIDED_SENSITIVE"],
              },
            },
          ],
        },
        data: { status: "FAILED", failureCode: "REPORT_BUILD_FAILED" },
      });
      return this.prisma.assessmentReport.findUnique({ where: { attemptId } });
    }
  }

  async report(id: string, userId: string) {
    let attempt = await this.ownedAttempt(id, userId);
    if (attempt.status === "IN_PROGRESS" && attempt.deadlineAt <= new Date()) {
      await this.finalizeAttempt(id, userId, new Date());
      attempt = await this.ownedAttempt(id, userId);
    }
    if (attempt.status === "IN_PROGRESS")
      throw new ConflictException({
        code: "ATTEMPT_IN_PROGRESS",
        message: "请先完成并提交考试",
      });
    const sensitiveVoid =
      attempt.status === "VOIDED" &&
      (attempt.override?.reasonCode === "SECURITY" ||
        attempt.override?.reasonCode === "CONTENT_ERROR");
    if (sensitiveVoid)
      return {
        attempt: attemptResponse(attempt),
        status: "FAILED",
        failureCode: "ATTEMPT_VOIDED_SENSITIVE",
        payload: null,
        voided: true,
      };
    const current = await this.prisma.assessmentReport.findUnique({
      where: { attemptId: id },
    });
    if (
      shouldGenerateAssessmentReport(
        attempt.status,
        current?.status ?? null,
        current?.failureCode ?? null,
      )
    )
      await this.generateReport(id);
    const report = await this.prisma.assessmentReport.findUnique({
      where: { attemptId: id },
    });
    return {
      attempt: attemptResponse(attempt),
      status: report?.status ?? "FAILED",
      failureCode:
        report?.failureCode ??
        (attempt.status === "VOIDED" ? "ATTEMPT_VOIDED" : null),
      payload: report?.payload ?? null,
      voided: attempt.status === "VOIDED",
    };
  }

  async adminVersions() {
    const now = new Date();
    const versions = await this.prisma.assessmentVersion.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        cycle: { include: { assessment: true } },
        _count: { select: { questions: true } },
      },
    });
    return versions.map((version) => ({
      id: version.id,
      assessmentSlug: version.cycle.assessment.slug,
      title: version.cycle.assessment.title,
      enabled: version.cycle.assessment.enabled,
      cycleKey: version.cycle.cycleKey,
      version: version.version,
      status: version.status,
      sourceReviewStatus: effectiveSourceReviewStatus(
        version.sourceReviewStatus,
        version.reviewDueAt,
        now,
      ),
      contentReviewStatus: version.contentReviewStatus,
      angoffStatus: version.angoffStatus,
      pilotStatus: version.pilotStatus,
      questionCount: version._count.questions,
      contentHash: version.contentHash,
      passScore: version.passScore,
      reviewDueAt: version.reviewDueAt?.toISOString() ?? null,
      publishedAt: version.publishedAt?.toISOString() ?? null,
    }));
  }

  async adminVersionQuality(id: string) {
    const version = await this.prisma.assessmentVersion.findUnique({
      where: { id },
      include: { questions: { orderBy: { position: "asc" } } },
    });
    if (!version)
      throw new NotFoundException({
        code: "ASSESSMENT_VERSION_NOT_FOUND",
        message: "题库版本不存在",
      });
    const attempts = await this.prisma.assessmentAttempt.findMany({
      where: {
        versionId: id,
        attemptNumber: 1,
        status: { in: ["SUBMITTED", "EXPIRED"] },
      },
      include: { answers: true, report: true },
    });
    const available = attempts.filter(
      (attempt) => attempt.report?.failureCode !== "DETAIL_RETENTION_EXPIRED",
    );
    return {
      versionId: id,
      version: version.version,
      firstAttemptSampleSize: available.length,
      items: buildAssessmentQuality(version.questions, available),
    };
  }

  async grantPilotParticipant(
    versionId: string,
    input: unknown,
    actorId: string,
    ip?: string,
  ) {
    const data = grantAssessmentPilotParticipantSchema.parse(input);
    return this.prisma.$transaction(async (tx) => {
      const [version, user] = await Promise.all([
        tx.assessmentVersion.findUnique({ where: { id: versionId } }),
        tx.user.findUnique({ where: { id: data.userId } }),
      ]);
      if (!version)
        throw new NotFoundException({
          code: "ASSESSMENT_VERSION_NOT_FOUND",
          message: "题库版本不存在",
        });
      if (!user || user.status !== "ACTIVE")
        throw new NotFoundException({
          code: "PILOT_USER_NOT_FOUND",
          message: "试测员工不存在或已停用",
        });
      if (
        version.status !== "VALIDATED" ||
        version.pilotStatus !== "PENDING_HUMAN" ||
        version.contentReviewStatus !== "APPROVED" ||
        version.angoffStatus !== "APPROVED" ||
        effectiveSourceReviewStatus(
          version.sourceReviewStatus,
          version.reviewDueAt,
          new Date(),
        ) !== "CURRENT"
      )
        throw new ConflictException({
          code: "PILOT_NOT_READY",
          message: "请先完成机器校验、内容审核、Angoff 定标和来源复核",
        });
      const participant = await tx.assessmentPilotParticipant.upsert({
        where: { versionId_userId: { versionId, userId: user.id } },
        create: { versionId, userId: user.id, grantedById: actorId },
        update: { grantedById: actorId, revokedAt: null, revokedById: null },
      });
      await tx.auditLog.create({
        data: {
          actorId,
          action: "assessment.pilot-participant.grant",
          resourceType: "assessment-version",
          resourceId: versionId,
          ipAddress: ip ?? null,
          metadata: { userId: user.id },
        },
      });
      return {
        id: participant.id,
        versionId,
        userId: user.id,
        displayName: user.displayName,
      };
    });
  }

  async pilotParticipants(versionId: string) {
    const [version, participants, attempts] = await Promise.all([
      this.prisma.assessmentVersion.findUnique({ where: { id: versionId } }),
      this.prisma.assessmentPilotParticipant.findMany({
        where: { versionId },
        include: { user: true },
        orderBy: { createdAt: "asc" },
      }),
      this.prisma.assessmentAttempt.findMany({
        where: { versionId, kind: "PILOT" },
        select: { userId: true, status: true, id: true },
      }),
    ]);
    if (!version)
      throw new NotFoundException({
        code: "ASSESSMENT_VERSION_NOT_FOUND",
        message: "题库版本不存在",
      });
    const attemptsByUser = new Map(
      attempts.map((attempt) => [attempt.userId, attempt]),
    );
    return participants.map((participant) => {
      const attempt = attemptsByUser.get(participant.userId);
      return {
        userId: participant.userId,
        displayName: participant.user.displayName,
        revokedAt: participant.revokedAt?.toISOString() ?? null,
        grantedAt: participant.createdAt.toISOString(),
        attemptId: attempt?.id ?? null,
        attemptStatus: attempt?.status ?? null,
      };
    });
  }

  async revokePilotParticipant(
    versionId: string,
    userId: string,
    actorId: string,
    ip?: string,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const participant = await tx.assessmentPilotParticipant.findUnique({
        where: { versionId_userId: { versionId, userId } },
      });
      if (!participant)
        throw new NotFoundException({
          code: "PILOT_PARTICIPANT_NOT_FOUND",
          message: "试测授权不存在",
        });
      const activeAttempt = await tx.assessmentAttempt.findFirst({
        where: { userId, versionId, kind: "PILOT", status: "IN_PROGRESS" },
        select: { id: true },
      });
      if (activeAttempt)
        throw new ConflictException({
          code: "PILOT_ATTEMPT_ACTIVE",
          message: "试测进行中，完成或由管理员作废后才能撤销授权",
        });
      await tx.assessmentPilotParticipant.update({
        where: { id: participant.id },
        data: { revokedAt: new Date(), revokedById: actorId },
      });
      await tx.auditLog.create({
        data: {
          actorId,
          action: "assessment.pilot-participant.revoke",
          resourceType: "assessment-version",
          resourceId: versionId,
          ipAddress: ip ?? null,
          metadata: { userId },
        },
      });
      return { versionId, userId, revoked: true };
    });
  }

  async validateVersion(id: string, actorId: string, ip?: string) {
    const version = await this.prisma.assessmentVersion.findUnique({
      where: { id },
      include: {
        questions: { include: { key: true, sources: true } },
      },
    });
    if (!version)
      throw new NotFoundException({
        code: "ASSESSMENT_VERSION_NOT_FOUND",
        message: "题库版本不存在",
      });
    if (version.status === "PUBLISHED" || version.status === "RETIRED")
      throw new ConflictException({
        code: "ASSESSMENT_VERSION_IMMUTABLE",
        message: "已发布或已归档的题库版本不能重新校验",
      });
    const counts = {
      questions: version.questions.length,
      keys: version.questions.filter((question) => question.key).length,
      sources: version.questions.filter((question) => question.sources.length)
        .length,
      dataQueries: version.questions.filter(
        (question) =>
          question.sourceType === "DATA" &&
          question.sources.some((source) => source.queryId),
      ).length,
      dimensions: Object.fromEntries(
        ["D1", "D2", "D3", "D4", "D5"].map((key) => [
          key,
          version.questions.filter(
            (question) => question.primaryDimension === key,
          ).length,
        ]),
      ),
      sourcesByType: Object.fromEntries(
        ["PAPER", "DATA", "BUSINESS"].map((key) => [
          key,
          version.questions.filter((question) => question.sourceType === key)
            .length,
        ]),
      ),
      difficulties: Object.fromEntries(
        ["L1", "L2", "L3"].map((key) => [
          key,
          version.questions.filter((question) => question.difficulty === key)
            .length,
        ]),
      ),
    };
    if (
      counts.questions !== 50 ||
      counts.keys !== 50 ||
      counts.sources !== 50 ||
      counts.dataQueries !== 10 ||
      Object.values(counts.dimensions).some((count) => count !== 10) ||
      counts.sourcesByType.PAPER !== 30 ||
      counts.sourcesByType.DATA !== 10 ||
      counts.sourcesByType.BUSINESS !== 10 ||
      counts.difficulties.L1 !== 10 ||
      counts.difficulties.L2 !== 25 ||
      counts.difficulties.L3 !== 15
    )
      throw new BadRequestException({
        code: "ASSESSMENT_VERSION_INVALID",
        message: "题库自动门禁未通过",
        fieldErrors: { counts: [JSON.stringify(counts)] },
      });
    await this.prisma.$transaction(async (tx) => {
      await tx.assessmentVersion.update({
        where: { id },
        data: { status: "VALIDATED" },
      });
      await tx.auditLog.create({
        data: {
          actorId,
          action: "assessment.version.validate",
          resourceType: "assessment-version",
          resourceId: id,
          ipAddress: ip ?? null,
          metadata: counts,
        },
      });
    });
    return { id, status: "VALIDATED", counts };
  }

  async approveVersionGates(
    id: string,
    input: unknown,
    actorId: string,
    ip?: string,
  ) {
    const data = assessmentGateApprovalSchema.parse(input);
    return this.prisma.$transaction(async (tx) => {
      const version = await tx.assessmentVersion.findUnique({ where: { id } });
      if (!version)
        throw new NotFoundException({
          code: "ASSESSMENT_VERSION_NOT_FOUND",
          message: "题库版本不存在",
        });
      if (version.status !== "VALIDATED" && version.status !== "PUBLISHED")
        throw new ConflictException({
          code: "ASSESSMENT_VERSION_NOT_VALIDATED",
          message: "请先通过自动题库门禁",
        });
      const completedPilots =
        data.pilotStatus === "APPROVED"
          ? await tx.assessmentAttempt.count({
              where: {
                versionId: id,
                kind: "PILOT",
                status: { in: ["SUBMITTED", "EXPIRED"] },
              },
            })
          : 0;
      if (data.pilotStatus === "APPROVED" && completedPilots === 0)
        throw new ConflictException({
          code: "PILOT_EVIDENCE_REQUIRED",
          message: "至少完成一位受控试测员工的答题后，才能批准试测门禁",
        });
      const reviewDueAt = new Date();
      reviewDueAt.setUTCMonth(reviewDueAt.getUTCMonth() + 6);
      const updated = await tx.assessmentVersion.update({
        where: { id },
        data: {
          contentReviewStatus: data.contentReviewStatus,
          angoffStatus: data.angoffStatus,
          pilotStatus: data.pilotStatus,
          sourceReviewStatus: data.sourceReviewStatus,
          passScore: data.passScore,
          reviewDueAt,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId,
          action: "assessment.version.human-gates-approve",
          resourceType: "assessment-version",
          resourceId: id,
          ipAddress: ip ?? null,
          metadata: {
            reviewReference: data.reviewReference,
            passScore: data.passScore,
            reviewDueAt: reviewDueAt.toISOString(),
            completedPilots,
          },
        },
      });
      return {
        id,
        contentReviewStatus: updated.contentReviewStatus,
        angoffStatus: updated.angoffStatus,
        pilotStatus: updated.pilotStatus,
        sourceReviewStatus: updated.sourceReviewStatus,
        passScore: updated.passScore,
        reviewDueAt: updated.reviewDueAt?.toISOString() ?? null,
      };
    });
  }

  async publishVersion(id: string, actorId: string, ip?: string) {
    return this.prisma.$transaction(async (tx) => {
      const version = await tx.assessmentVersion.findUnique({
        where: { id },
        include: { cycle: true, _count: { select: { questions: true } } },
      });
      if (!version)
        throw new NotFoundException({
          code: "ASSESSMENT_VERSION_NOT_FOUND",
          message: "题库版本不存在",
        });
      const now = new Date();
      const gateApproval = await tx.auditLog.findFirst({
        where: {
          action: "assessment.version.human-gates-approve",
          resourceType: "assessment-version",
          resourceId: id,
        },
        orderBy: { createdAt: "desc" },
        select: { id: true },
      });
      const blocked = [
        version.status !== "VALIDATED" ? "自动门禁" : null,
        effectiveSourceReviewStatus(
          version.sourceReviewStatus,
          version.reviewDueAt,
          now,
        ) !== "CURRENT"
          ? "来源复核"
          : null,
        version.contentReviewStatus !== "APPROVED" ? "内容人工复核" : null,
        version.angoffStatus !== "APPROVED" ? "Angoff 定标" : null,
        version.pilotStatus !== "APPROVED" ? "试测分析" : null,
        !gateApproval ? "人工门禁审计" : null,
        version._count.questions !== 50 ? "题量" : null,
      ].filter((item): item is string => Boolean(item));
      if (blocked.length)
        throw new BadRequestException({
          code: "ASSESSMENT_PUBLICATION_BLOCKED",
          message: `发布门禁未完成：${blocked.join("、")}`,
        });
      await tx.assessmentVersion.updateMany({
        where: {
          id: { not: id },
          status: "PUBLISHED",
          cycle: { assessmentId: version.cycle.assessmentId },
        },
        data: { status: "RETIRED" },
      });
      await tx.assessmentCycle.updateMany({
        where: {
          assessmentId: version.cycle.assessmentId,
          id: { not: version.cycleId },
        },
        data: { status: "CLOSED" },
      });
      await tx.assessmentCycle.update({
        where: { id: version.cycleId },
        data: { status: "ACTIVE" },
      });
      const publishedAt = now;
      await tx.assessmentVersion.update({
        where: { id },
        data: { status: "PUBLISHED", publishedAt },
      });
      await tx.assessment.update({
        where: { id: version.cycle.assessmentId },
        data: { enabled: true },
      });
      await tx.auditLog.create({
        data: {
          actorId,
          action: "assessment.version.publish",
          resourceType: "assessment-version",
          resourceId: id,
          ipAddress: ip ?? null,
          metadata: { publishedAt: publishedAt.toISOString() },
        },
      });
      return {
        id,
        status: "PUBLISHED",
        publishedAt: publishedAt.toISOString(),
      };
    });
  }

  async retireVersion(id: string, actorId: string, ip?: string) {
    const version = await this.prisma.assessmentVersion.findUnique({
      where: { id },
      include: { cycle: true },
    });
    if (!version)
      throw new NotFoundException({
        code: "ASSESSMENT_VERSION_NOT_FOUND",
        message: "题库版本不存在",
      });
    await this.prisma.$transaction(async (tx) => {
      await tx.assessmentVersion.update({
        where: { id },
        data: { status: "RETIRED" },
      });
      if (version.status === "PUBLISHED") {
        await tx.assessmentCycle.update({
          where: { id: version.cycleId },
          data: { status: "CLOSED" },
        });
        await tx.assessment.update({
          where: { id: version.cycle.assessmentId },
          data: { enabled: false },
        });
      }
      await tx.auditLog.create({
        data: {
          actorId,
          action: "assessment.version.retire",
          resourceType: "assessment-version",
          resourceId: id,
          ipAddress: ip ?? null,
        },
      });
    });
    return { id, status: "RETIRED" };
  }

  async adminAttempts() {
    const attempts = await this.prisma.assessmentAttempt.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: { user: true, assessment: true, version: true },
    });
    if (!attempts.length) return [];
    const groupAttempts = await this.prisma.assessmentAttempt.findMany({
      where: {
        OR: attempts.map((attempt) => ({
          userId: attempt.userId,
          cycleId: attempt.cycleId,
        })),
      },
      orderBy: { attemptNumber: "asc" },
      include: { version: true },
    });
    const summaries = new Map<
      string,
      { firstScore: number | null; bestScore: number | null; passed: boolean }
    >();
    for (const attempt of groupAttempts) {
      if (attempt.status !== "SUBMITTED" && attempt.status !== "EXPIRED")
        continue;
      const key = `${attempt.userId}:${attempt.cycleId}:${attempt.kind}`;
      const current = summaries.get(key) ?? {
        firstScore: null,
        bestScore: null,
        passed: false,
      };
      if (current.firstScore === null) current.firstScore = attempt.score;
      if (attempt.score !== null)
        current.bestScore = Math.max(current.bestScore ?? 0, attempt.score);
      current.passed ||=
        attempt.score !== null && attempt.score >= attempt.version.passScore;
      summaries.set(key, current);
    }
    return attempts.map((attempt) => ({
      id: attempt.id,
      employee: attempt.user.displayName,
      assessment: attempt.assessment.title,
      version: attempt.version.version,
      attemptNumber: attempt.attemptNumber,
      status: attempt.status,
      kind: attempt.kind,
      score: attempt.score,
      ...(summaries.get(
        `${attempt.userId}:${attempt.cycleId}:${attempt.kind}`,
      ) ?? {
        firstScore: null,
        bestScore: null,
        passed: false,
      }),
      startedAt: attempt.startedAt.toISOString(),
      submittedAt: attempt.submittedAt?.toISOString() ?? null,
    }));
  }

  async voidAttempt(id: string, input: unknown, actorId: string, ip?: string) {
    const data = voidAssessmentAttemptSchema.parse(input);
    return this.prisma.$transaction(async (tx) => {
      const attempt = await tx.assessmentAttempt.findUnique({ where: { id } });
      if (!attempt)
        throw new NotFoundException({
          code: "ATTEMPT_NOT_FOUND",
          message: "考试不存在",
        });
      await tx.assessmentAttempt.update({
        where: { id },
        data: { status: "VOIDED" },
      });
      await tx.assessmentOverride.upsert({
        where: { attemptId: id },
        create: {
          attemptId: id,
          actorId,
          reasonCode: data.reasonCode,
          reason: data.reason,
        },
        update: { reasonCode: data.reasonCode, reason: data.reason },
      });
      if (data.reasonCode === "SECURITY" || data.reasonCode === "CONTENT_ERROR")
        await tx.assessmentReport.updateMany({
          where: { attemptId: id },
          data: {
            status: "FAILED",
            payload: Prisma.DbNull,
            failureCode: "ATTEMPT_VOIDED_SENSITIVE",
          },
        });
      await tx.auditLog.create({
        data: {
          actorId,
          action: "assessment.attempt.void",
          resourceType: "assessment-attempt",
          resourceId: id,
          ipAddress: ip ?? null,
          metadata: {
            reasonCode: data.reasonCode,
            previousStatus: attempt.status,
          },
        },
      });
      return { id, status: "VOIDED" };
    });
  }

  async adminReport(id: string, actorId: string, ip?: string) {
    const attempt = await this.prisma.assessmentAttempt.findUnique({
      where: { id },
      include: { report: true },
    });
    if (!attempt)
      throw new NotFoundException({
        code: "ATTEMPT_NOT_FOUND",
        message: "考试不存在",
      });
    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: "assessment.report.admin-view",
        resourceType: "assessment-attempt",
        resourceId: id,
        ipAddress: ip ?? null,
      },
    });
    return {
      status: attempt.report?.status ?? "FAILED",
      failureCode: attempt.report?.failureCode ?? null,
      payload: attempt.report?.payload ?? null,
      voided: attempt.status === "VOIDED",
    };
  }
}
