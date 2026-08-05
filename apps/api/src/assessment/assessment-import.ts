import { Prisma, type PrismaClient } from "@prisma/client";
import type { AssessmentImportPack } from "@orosaga/contracts";
import { misconceptionLabels } from "./misconception-labels.js";

export async function importAssessmentPack(
  prisma: PrismaClient,
  input: {
    pack: AssessmentImportPack;
    contentHash: string;
    cycleKey: string;
    startsAt: Date;
    reviewDueAt: Date;
  },
) {
  const { pack } = input;
  return prisma.$transaction(async (tx) => {
    const assessment = await tx.assessment.upsert({
      where: { slug: pack.assessment.slug },
      create: {
        slug: pack.assessment.slug,
        title: pack.assessment.title,
        enabled: false,
      },
      update: { title: pack.assessment.title },
    });
    const cycle = await tx.assessmentCycle.upsert({
      where: {
        assessmentId_cycleKey: {
          assessmentId: assessment.id,
          cycleKey: input.cycleKey,
        },
      },
      create: {
        assessmentId: assessment.id,
        cycleKey: input.cycleKey,
        status: "CLOSED",
        maxAttempts: pack.assessment.cycleAttemptLimit,
        dailyLimit: pack.assessment.dailyLimit,
        startsAt: input.startsAt,
      },
      update: {},
    });
    const duplicate = await tx.assessmentVersion.findUnique({
      where: {
        cycleId_version: {
          cycleId: cycle.id,
          version: pack.assessment.version,
        },
      },
    });
    if (duplicate)
      throw new Error("同一认证周期已存在相同题库版本，导入已停止");

    const version = await tx.assessmentVersion.create({
      data: {
        cycleId: cycle.id,
        version: pack.assessment.version,
        status: "DRAFT",
        sourceReviewStatus: pack.assessment.sourceReviewStatus,
        contentReviewStatus: "PENDING_HUMAN",
        angoffStatus: "PENDING_HUMAN",
        pilotStatus: "PENDING_HUMAN",
        sourceCommit: pack.assessment.sourceCommit,
        datasetVersion: pack.assessment.datasetVersion,
        businessHash: pack.assessment.businessContentHash,
        workflowHash: pack.assessment.workflowHash,
        contentHash: input.contentHash,
        questionCount: pack.assessment.questionCount,
        durationMinutes: pack.assessment.durationMinutes,
        passScore: pack.assessment.passScore,
        reviewDueAt: input.reviewDueAt,
      },
    });

    for (const [positionIndex, item] of pack.questions.entries()) {
      const publicOptions = item.options.map(({ id, text }) => ({ id, text }));
      const optionRationales = Object.fromEntries(
        item.options.map((option) => [option.id, option.rationale]),
      );
      const misconceptions = Object.fromEntries(
        item.options.map((option) => [option.id, option.misconception]),
      );
      const labels = Object.fromEntries(
        item.options
          .map((option) => option.misconception)
          .filter((code): code is string => Boolean(code))
          .map((code) => [code, misconceptionLabels[code] ?? code]),
      );
      const question = await tx.assessmentQuestion.create({
        data: {
          versionId: version.id,
          stableKey: item.id,
          position: positionIndex + 1,
          primaryDimension: item.primaryDimension,
          sourceType: item.sourceType,
          difficulty: item.difficulty,
          topic: item.topic,
          stem: item.stem,
          options: publicOptions as Prisma.InputJsonValue,
          deliveryStages: item.deliveryStages,
          businessImportance: item.businessImportance,
        },
      });
      await tx.assessmentQuestionKey.create({
        data: {
          questionId: question.id,
          correctOptionId: item.correctOptionId,
          optionRationales: optionRationales as Prisma.InputJsonValue,
          misconceptions: misconceptions as Prisma.InputJsonValue,
          misconceptionLabels: labels as Prisma.InputJsonValue,
          coreRationale: item.coreRationale,
          reasoningSteps: item.reasoningSteps,
          businessApplication: item.businessApplication,
          learningPaths: item.learningPath,
        },
      });
      await tx.questionSource.createMany({
        data: item.sourceIds.map((sourceId, sourceIndex) => ({
          questionId: question.id,
          sourceId,
          queryId: sourceIndex === 0 ? (item.evidenceQueryId ?? null) : null,
        })),
      });
    }
    return {
      assessmentId: assessment.id,
      cycleId: cycle.id,
      versionId: version.id,
      status: version.status,
      questions: pack.questions.length,
      humanGatesApproved: [
        version.contentReviewStatus,
        version.angoffStatus,
        version.pilotStatus,
      ].every((status) => status === "APPROVED"),
    };
  });
}
