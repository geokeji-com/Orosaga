import { createHash } from "node:crypto";
import { Prisma, type PrismaClient } from "@prisma/client";

type RetentionAttempt = {
  id: string;
  userId: string;
  status: "IN_PROGRESS" | "SUBMITTED" | "EXPIRED" | "VOIDED";
  createdAt: Date;
  submittedAt: Date | null;
  hasDetail: boolean;
};

export type AssessmentRetentionPlan = {
  detailCutoff: Date;
  summaryCutoff: Date;
  redactDetailAttemptIds: string[];
  deleteSummaryAttemptIds: string[];
  targetDigest: string;
};

const subtractUtcMonths = (source: Date, months: number) => {
  const year = source.getUTCFullYear();
  const month = source.getUTCMonth() - months;
  const targetMonthStart = new Date(Date.UTC(year, month, 1));
  const targetMonthEnd = new Date(
    Date.UTC(
      targetMonthStart.getUTCFullYear(),
      targetMonthStart.getUTCMonth() + 1,
      0,
    ),
  ).getUTCDate();
  return new Date(
    Date.UTC(
      targetMonthStart.getUTCFullYear(),
      targetMonthStart.getUTCMonth(),
      Math.min(source.getUTCDate(), targetMonthEnd),
      source.getUTCHours(),
      source.getUTCMinutes(),
      source.getUTCSeconds(),
      source.getUTCMilliseconds(),
    ),
  );
};

export function buildAssessmentRetentionPlan(
  attempts: RetentionAttempt[],
  input: {
    assessmentId: string;
    assessmentSlug: string;
    asOf: Date;
    detailMonths: number;
    summaryMonths: number;
  },
): AssessmentRetentionPlan {
  if (input.detailMonths <= 0 || input.summaryMonths <= input.detailMonths)
    throw new Error("成绩摘要保留月数必须大于详细数据保留月数");
  const detailCutoff = subtractUtcMonths(input.asOf, input.detailMonths);
  const summaryCutoff = subtractUtcMonths(input.asOf, input.summaryMonths);
  const effective = attempts.filter(
    (attempt) =>
      (attempt.status === "SUBMITTED" || attempt.status === "EXPIRED") &&
      attempt.submittedAt,
  );
  const latestByUser = new Map<string, Date>();
  for (const attempt of effective) {
    const submittedAt = attempt.submittedAt!;
    const latest = latestByUser.get(attempt.userId);
    if (!latest || submittedAt > latest)
      latestByUser.set(attempt.userId, submittedAt);
  }
  const deleteSummaryAttemptIds = attempts
    .filter((attempt) => {
      if (attempt.status === "IN_PROGRESS") return false;
      return (attempt.submittedAt ?? attempt.createdAt) <= summaryCutoff;
    })
    .map((attempt) => attempt.id)
    .sort();
  const deleting = new Set(deleteSummaryAttemptIds);
  const redactDetailAttemptIds = attempts
    .filter((attempt) => {
      if (attempt.status === "IN_PROGRESS" || !attempt.hasDetail) return false;
      const latestEffective = latestByUser.get(attempt.userId);
      const retentionReference =
        latestEffective ?? attempt.submittedAt ?? attempt.createdAt;
      return retentionReference <= detailCutoff && !deleting.has(attempt.id);
    })
    .map((attempt) => attempt.id)
    .sort();
  const targetDigestPayload = JSON.stringify({
    version: 1,
    assessmentId: input.assessmentId,
    assessmentSlug: input.assessmentSlug,
    asOf: input.asOf.toISOString(),
    detailCutoff: detailCutoff.toISOString(),
    summaryCutoff: summaryCutoff.toISOString(),
    actions: {
      redactDetailAttemptIds,
      deleteSummaryAttemptIds,
    },
  });
  const targetDigest = createHash("sha256")
    .update(targetDigestPayload)
    .digest("hex");
  return {
    detailCutoff,
    summaryCutoff,
    redactDetailAttemptIds,
    deleteSummaryAttemptIds,
    targetDigest,
  };
}

export async function planAssessmentRetention(
  prisma: PrismaClient,
  input: {
    assessmentSlug: string;
    asOf: Date;
    detailMonths: number;
    summaryMonths: number;
  },
) {
  const assessment = await prisma.assessment.findUnique({
    where: { slug: input.assessmentSlug },
  });
  if (!assessment) throw new Error("测评不存在");
  const attempts = await prisma.assessmentAttempt.findMany({
    where: { assessmentId: assessment.id },
    select: {
      id: true,
      userId: true,
      status: true,
      createdAt: true,
      submittedAt: true,
      _count: { select: { answers: true } },
      report: { select: { payload: true } },
    },
  });
  const plan = buildAssessmentRetentionPlan(
    attempts.map((attempt) => ({
      id: attempt.id,
      userId: attempt.userId,
      status: attempt.status,
      createdAt: attempt.createdAt,
      submittedAt: attempt.submittedAt,
      hasDetail:
        attempt._count.answers > 0 ||
        Boolean(attempt.report && attempt.report.payload !== null),
    })),
    {
      assessmentId: assessment.id,
      assessmentSlug: assessment.slug,
      asOf: input.asOf,
      detailMonths: input.detailMonths,
      summaryMonths: input.summaryMonths,
    },
  );
  return { assessment, plan };
}

export async function applyAssessmentRetention(
  prisma: PrismaClient,
  input: {
    assessmentId: string;
    assessmentSlug: string;
    asOf: Date;
    detailMonths: number;
    summaryMonths: number;
    expectedDigest: string;
    maxTargets: number;
  },
) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw(
      Prisma.sql`SELECT pg_advisory_xact_lock(hashtextextended(${`assessment-retention:${input.assessmentId}`}, 0))`,
    );
    const assessment = await tx.assessment.findUnique({
      where: { id: input.assessmentId },
      select: { slug: true },
    });
    if (!assessment || assessment.slug !== input.assessmentSlug)
      throw new Error("测评标识已变化，清理已停止");
    const attempts = await tx.assessmentAttempt.findMany({
      where: { assessmentId: input.assessmentId },
      select: {
        id: true,
        userId: true,
        status: true,
        createdAt: true,
        submittedAt: true,
        _count: { select: { answers: true } },
        report: { select: { payload: true } },
      },
    });
    const plan = buildAssessmentRetentionPlan(
      attempts.map((attempt) => ({
        id: attempt.id,
        userId: attempt.userId,
        status: attempt.status,
        createdAt: attempt.createdAt,
        submittedAt: attempt.submittedAt,
        hasDetail:
          attempt._count.answers > 0 ||
          Boolean(attempt.report && attempt.report.payload !== null),
      })),
      {
        assessmentId: input.assessmentId,
        assessmentSlug: input.assessmentSlug,
        asOf: input.asOf,
        detailMonths: input.detailMonths,
        summaryMonths: input.summaryMonths,
      },
    );
    if (plan.targetDigest !== input.expectedDigest)
      throw new Error("清理目标与预览摘要不一致，清理已停止");
    const targetCount =
      plan.redactDetailAttemptIds.length + plan.deleteSummaryAttemptIds.length;
    if (targetCount > input.maxTargets)
      throw new Error(
        `清理目标 ${targetCount} 超过确认上限 ${input.maxTargets}，清理已停止`,
      );
    const { redactDetailAttemptIds, deleteSummaryAttemptIds } = plan;
    const redactedAnswers = redactDetailAttemptIds.length
      ? await tx.assessmentAnswer.deleteMany({
          where: { attemptId: { in: redactDetailAttemptIds } },
        })
      : { count: 0 };
    const redactedReports = redactDetailAttemptIds.length
      ? await tx.assessmentReport.updateMany({
          where: { attemptId: { in: redactDetailAttemptIds } },
          data: {
            payload: Prisma.DbNull,
            status: "FAILED",
            failureCode: "DETAIL_RETENTION_EXPIRED",
          },
        })
      : { count: 0 };

    let deletedAttempts = { count: 0 };
    if (deleteSummaryAttemptIds.length) {
      await tx.assessmentAnswer.deleteMany({
        where: { attemptId: { in: deleteSummaryAttemptIds } },
      });
      await tx.assessmentReport.deleteMany({
        where: { attemptId: { in: deleteSummaryAttemptIds } },
      });
      await tx.assessmentOverride.deleteMany({
        where: { attemptId: { in: deleteSummaryAttemptIds } },
      });
      await tx.auditLog.deleteMany({
        where: {
          resourceType: { in: ["assessment-attempt", "assessment-report"] },
          resourceId: { in: deleteSummaryAttemptIds },
        },
      });
      deletedAttempts = await tx.assessmentAttempt.deleteMany({
        where: { id: { in: deleteSummaryAttemptIds } },
      });
    }
    await tx.auditLog.create({
      data: {
        actorId: null,
        action: "assessment.retention.apply",
        resourceType: "assessment",
        resourceId: input.assessmentId,
        metadata: {
          assessmentSlug: input.assessmentSlug,
          detailCutoff: plan.detailCutoff.toISOString(),
          summaryCutoff: plan.summaryCutoff.toISOString(),
          targetDigest: plan.targetDigest,
          maxTargets: input.maxTargets,
          redactedAnswers: redactedAnswers.count,
          redactedReports: redactedReports.count,
          deletedAttempts: deletedAttempts.count,
        },
      },
    });
    return {
      redactedAnswers: redactedAnswers.count,
      redactedReports: redactedReports.count,
      deletedAttempts: deletedAttempts.count,
      targetDigest: plan.targetDigest,
    };
  });
}
