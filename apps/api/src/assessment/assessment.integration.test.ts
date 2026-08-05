import { randomUUID } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { Prisma, PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { databaseSchemaFromUrl } from "@orosaga/config";
import { importAssessmentPack } from "./assessment-import.js";
import { validateAssessmentPack } from "./assessment-pack.js";
import { AssessmentService } from "./assessment.service.js";
import type { PrismaService } from "../prisma/prisma.service.js";
import { ContentService } from "../content/content.service.js";

const databaseUrl = process.env.ASSESSMENT_INTEGRATION_DATABASE_URL;
const integration = describe.skipIf(!databaseUrl);
const integrationRunId = randomUUID();
const assessmentSlug = `geo-foundations-${integrationRunId}`;

const makePack = (version: string) => ({
  schemaVersion: "1.0.0",
  assessment: {
    slug: assessmentSlug,
    title: "GEO 基础能力测评",
    version,
    purpose: "TRAINING_MASTERY",
    questionCount: 50,
    durationMinutes: 30,
    passScore: 80,
    dailyLimit: 1,
    cycleAttemptLimit: 3,
    sourceCommit: "a".repeat(40),
    datasetVersion: "2.0.1",
    businessContentHash: "b".repeat(64),
    workflowHash: "c".repeat(64),
    sourceReviewStatus: "CURRENT",
    contentReviewStatus: "PENDING_HUMAN",
    angoffStatus: "PENDING_HUMAN",
    pilotStatus: "PENDING_HUMAN",
  },
  questions: Array.from({ length: 50 }, (_, index) => {
    const sourceType = index < 30 ? "PAPER" : index < 40 ? "DATA" : "BUSINESS";
    return {
      id: `GEO-${String(index + 1).padStart(3, "0")}`,
      primaryDimension: `D${Math.floor(index / 10) + 1}`,
      sourceType,
      difficulty: index < 10 ? "L1" : index < 35 ? "L2" : "L3",
      topic: "FOUNDATION",
      deliveryStages: ["diagnosis"],
      businessImportance: 3,
      ...(sourceType === "DATA" ? { evidenceQueryId: "DQ-001" } : {}),
      stem: `第 ${index + 1} 题应如何判断证据边界？`,
      options: [
        { id: "a", text: "选项 A", rationale: "A 解析", misconception: "M-A" },
        { id: "b", text: "选项 B", rationale: "B 解析", misconception: null },
        { id: "c", text: "选项 C", rationale: "C 解析", misconception: "M-C" },
        { id: "d", text: "选项 D", rationale: "D 解析", misconception: "M-D" },
      ],
      correctOptionId: "b",
      coreRationale: "依据证据边界判断。",
      reasoningSteps: ["确认问题", "核对证据"],
      businessApplication: "用于客户项目复核。",
      sourceIds: [
        sourceType === "PAPER" ? "P01" : sourceType === "DATA" ? "D01" : "B01",
      ],
      learningPath: ["/workflow"],
    };
  }),
});

integration("assessment PostgreSQL integration", () => {
  let prisma: PrismaClient;
  let service: AssessmentService;
  let content: ContentService;
  let adminId: string;
  let employeeId: string;
  let otherId: string;

  beforeAll(async () => {
    prisma = new PrismaClient({
      adapter: new PrismaPg(
        { connectionString: databaseUrl! },
        { schema: databaseSchemaFromUrl(databaseUrl!) },
      ),
    });
    service = new AssessmentService(prisma as unknown as PrismaService);
    content = new ContentService(prisma as unknown as PrismaService);
    const [admin, employee, other] = await Promise.all([
      prisma.user.create({
        data: {
          openId: `ou_admin_${integrationRunId}`,
          displayName: "管理员",
          role: "ADMIN",
        },
      }),
      prisma.user.create({
        data: {
          openId: `ou_employee_${integrationRunId}`,
          displayName: "员工甲",
        },
      }),
      prisma.user.create({
        data: {
          openId: `ou_other_${integrationRunId}`,
          displayName: "员工乙",
        },
      }),
    ]);
    adminId = admin.id;
    employeeId = employee.id;
    otherId = other.id;
  });

  const completePilot = async (
    versionId: string,
    reviewReference: string,
    passScore = 80,
  ) => {
    await service.approveVersionGates(
      versionId,
      {
        contentReviewStatus: "APPROVED",
        angoffStatus: "APPROVED",
        pilotStatus: "PENDING_HUMAN",
        sourceReviewStatus: "CURRENT",
        passScore,
        reviewReference: `${reviewReference}-readiness`,
      },
      adminId,
    );
    await service.grantPilotParticipant(
      versionId,
      { userId: employeeId },
      adminId,
    );
    await service.grantPilotParticipant(
      versionId,
      { userId: otherId },
      adminId,
    );
    const attempt = await service.createAttempt(
      assessmentSlug,
      { idempotencyKey: `pilot-${randomUUID()}` },
      employeeId,
    );
    expect(attempt.kind).toBe("PILOT");
    await service.submit(attempt.id, employeeId);
    await service.approveVersionGates(
      versionId,
      {
        contentReviewStatus: "APPROVED",
        angoffStatus: "APPROVED",
        pilotStatus: "APPROVED",
        sourceReviewStatus: "CURRENT",
        passScore,
        reviewReference,
      },
      adminId,
    );
    await expect(
      service.createAttempt(
        assessmentSlug,
        { idempotencyKey: `pilot-after-approval-${randomUUID()}` },
        otherId,
      ),
    ).rejects.toMatchObject({ response: { code: "ASSESSMENT_UNAVAILABLE" } });
  };

  afterAll(async () => {
    await prisma?.$disconnect();
  });

  it("enforces import gates, answer isolation, ownership, concurrency and cross-cycle quota", async () => {
    const first = validateAssessmentPack(JSON.stringify(makePack("1.0.0")));
    const imported = await importAssessmentPack(prisma, {
      pack: first.pack,
      contentHash: first.contentHash,
      cycleKey: "2026-H2",
      startsAt: new Date(Date.now() - 3_600_000),
      reviewDueAt: new Date(Date.now() + 86_400_000),
    });
    expect(
      await prisma.assessmentVersion.findUnique({
        where: { id: imported.versionId },
        select: {
          contentReviewStatus: true,
          angoffStatus: true,
          pilotStatus: true,
          cycle: { select: { status: true } },
        },
      }),
    ).toMatchObject({
      contentReviewStatus: "PENDING_HUMAN",
      angoffStatus: "PENDING_HUMAN",
      pilotStatus: "PENDING_HUMAN",
      cycle: { status: "CLOSED" },
    });
    await service.validateVersion(imported.versionId, adminId);
    await expect(
      service.approveVersionGates(
        imported.versionId,
        {
          contentReviewStatus: "APPROVED",
          angoffStatus: "APPROVED",
          pilotStatus: "APPROVED",
          sourceReviewStatus: "CURRENT",
          passScore: 80,
          reviewReference: "integration-review-without-pilot",
        },
        adminId,
      ),
    ).rejects.toMatchObject({ response: { code: "PILOT_EVIDENCE_REQUIRED" } });
    await completePilot(imported.versionId, "integration-review-2026-H2");
    await prisma.assessmentVersion.update({
      where: { id: imported.versionId },
      data: { reviewDueAt: new Date(Date.now() - 1_000) },
    });
    await expect(
      service.publishVersion(imported.versionId, adminId),
    ).rejects.toMatchObject({
      response: { code: "ASSESSMENT_PUBLICATION_BLOCKED" },
    });
    await prisma.assessmentVersion.update({
      where: { id: imported.versionId },
      data: { reviewDueAt: new Date(Date.now() + 86_400_000) },
    });
    await service.publishVersion(imported.versionId, adminId);
    await expect(
      service.validateVersion(imported.versionId, adminId),
    ).rejects.toMatchObject({
      response: { code: "ASSESSMENT_VERSION_IMMUTABLE" },
    });

    const concurrent = await Promise.allSettled([
      service.createAttempt(
        assessmentSlug,
        { idempotencyKey: "integration-attempt-key-0001" },
        employeeId,
      ),
      service.createAttempt(
        assessmentSlug,
        { idempotencyKey: "integration-attempt-key-0002" },
        employeeId,
      ),
    ]);
    expect(
      concurrent.filter((result) => result.status === "fulfilled"),
    ).toHaveLength(1);
    const stored = await prisma.assessmentAttempt.findMany({
      where: { userId: employeeId, kind: "FORMAL" },
    });
    expect(stored).toHaveLength(1);
    expect(JSON.stringify(stored[0]!.manifest)).not.toMatch(
      /correct|rationale/i,
    );

    const attemptId = stored[0]!.id;
    const question = await service.question(attemptId, 1, employeeId);
    expect(question.options).toHaveLength(4);
    expect(question).not.toHaveProperty("correctOptionId");
    expect(JSON.stringify(question)).not.toMatch(/rationale/i);
    await expect(service.question(attemptId, 1, otherId)).rejects.toMatchObject(
      { status: 404 },
    );

    await service.saveAnswer(
      attemptId,
      question.id,
      { selectedOptionId: "b", revision: 0, activeDurationMs: 12_000 },
      employeeId,
    );
    const submitted = await service.submit(attemptId, employeeId);
    expect(submitted).toMatchObject({
      status: "SUBMITTED",
      score: 2,
      answeredCount: 1,
    });
    expect(await service.submit(attemptId, employeeId)).toMatchObject({
      status: "SUBMITTED",
      score: 2,
    });
    const report = await service.report(attemptId, employeeId);
    expect(report).toMatchObject({ status: "READY", voided: false });
    expect(
      (report.payload as { questionResults: unknown[] }).questionResults,
    ).toHaveLength(50);
    const reportQuestions = (
      report.payload as {
        questionResults: Array<{
          options: Array<{ id: string }>;
        }>;
      }
    ).questionResults;
    const manifest = stored[0]!.manifest as {
      questions: Array<{ optionOrder: string[] }>;
    };
    expect(
      reportQuestions.map((item) => item.options.map((option) => option.id)),
    ).toEqual(manifest.questions.map((item) => item.optionOrder));

    await expect(
      service.createAttempt(
        assessmentSlug,
        { idempotencyKey: "integration-attempt-key-0003" },
        employeeId,
      ),
    ).rejects.toMatchObject({ status: 403 });
    await service.voidAttempt(
      attemptId,
      { reasonCode: "TECHNICAL", reason: "集成测试确认作废后释放当日配额" },
      adminId,
    );
    expect(await service.report(attemptId, employeeId)).toMatchObject({
      status: "READY",
      voided: true,
    });

    const secondAttempt = await service.createAttempt(
      assessmentSlug,
      { idempotencyKey: "integration-attempt-key-0004" },
      employeeId,
    );
    expect(secondAttempt.attemptNumber).toBe(1);
    await service.submit(secondAttempt.id, employeeId);
    await prisma.assessmentAttempt.update({
      where: { id: secondAttempt.id },
      data: { score: 82 },
    });
    await prisma.assessmentReport.update({
      where: { attemptId: secondAttempt.id },
      data: {
        status: "FAILED",
        payload: Prisma.DbNull,
        failureCode: "DETAIL_RETENTION_EXPIRED",
      },
    });
    await (
      service as unknown as {
        generateReport(attemptId: string): Promise<unknown>;
      }
    ).generateReport(secondAttempt.id);
    expect(
      await prisma.assessmentReport.findUnique({
        where: { attemptId: secondAttempt.id },
        select: { status: true, failureCode: true, payload: true },
      }),
    ).toEqual({
      status: "FAILED",
      failureCode: "DETAIL_RETENTION_EXPIRED",
      payload: null,
    });

    const revised = validateAssessmentPack(JSON.stringify(makePack("1.1.0")));
    const revisedImported = await importAssessmentPack(prisma, {
      pack: revised.pack,
      contentHash: revised.contentHash,
      cycleKey: "2026-H2",
      startsAt: new Date(Date.now() - 3_600_000),
      reviewDueAt: new Date(Date.now() + 86_400_000),
    });
    await service.validateVersion(revisedImported.versionId, adminId);
    await completePilot(
      revisedImported.versionId,
      "integration-review-2026-H2-v1.1",
      85,
    );
    await service.publishVersion(revisedImported.versionId, adminId);
    expect(await service.overview(assessmentSlug, employeeId)).toMatchObject({
      bestScore: 82,
      passed: true,
      passScore: 85,
    });

    const sensitiveAttempt = await service.createAttempt(
      assessmentSlug,
      { idempotencyKey: "integration-sensitive-attempt-0001" },
      otherId,
    );
    await service.submit(sensitiveAttempt.id, otherId);
    await service.voidAttempt(
      sensitiveAttempt.id,
      { reasonCode: "SECURITY", reason: "集成测试确认安全作废撤回答案解析" },
      adminId,
    );
    expect(await service.report(sensitiveAttempt.id, otherId)).toMatchObject({
      status: "FAILED",
      failureCode: "ATTEMPT_VOIDED_SENSITIVE",
      payload: null,
      voided: true,
    });

    const expiringAttempt = await service.createAttempt(
      assessmentSlug,
      { idempotencyKey: "integration-expired-attempt-0001" },
      otherId,
    );
    const yesterday = new Date();
    yesterday.setUTCDate(yesterday.getUTCDate() - 1);
    yesterday.setUTCHours(0, 0, 0, 0);
    await prisma.assessmentAttempt.update({
      where: { id: expiringAttempt.id },
      data: {
        quotaDate: yesterday,
        startedAt: new Date(Date.now() - 7_200_000),
        deadlineAt: new Date(Date.now() - 3_600_000),
      },
    });
    const afterExpiry = await service.createAttempt(
      assessmentSlug,
      { idempotencyKey: "integration-after-expiry-0001" },
      otherId,
    );
    expect(afterExpiry.attemptNumber).toBe(2);
    expect(
      await prisma.assessmentAttempt.findUnique({
        where: { id: expiringAttempt.id },
        select: { status: true },
      }),
    ).toEqual({ status: "EXPIRED" });

    const second = validateAssessmentPack(JSON.stringify(makePack("2.0.0")));
    const secondImported = await importAssessmentPack(prisma, {
      pack: second.pack,
      contentHash: second.contentHash,
      cycleKey: "2027-H1",
      startsAt: new Date(Date.now() - 1_000),
      reviewDueAt: new Date(Date.now() + 86_400_000),
    });
    await service.validateVersion(secondImported.versionId, adminId);
    const company = await prisma.contentPage.findUniqueOrThrow({
      where: { slug: "company" },
      include: { currentRevision: true },
    });
    await content.save(
      company.id,
      {
        expectedVersion: company.version,
        content: company.currentRevision!.payload,
        changeSummary: "集成测试确认业务内容更新会冻结全部候选题库",
      },
      adminId,
    );
    expect(
      await prisma.assessmentVersion.findMany({
        where: {
          id: { in: [revisedImported.versionId, secondImported.versionId] },
        },
        orderBy: { version: "asc" },
        select: {
          sourceReviewStatus: true,
          contentReviewStatus: true,
        },
      }),
    ).toEqual([
      {
        sourceReviewStatus: "REVIEW_REQUIRED",
        contentReviewStatus: "PENDING_HUMAN",
      },
      {
        sourceReviewStatus: "REVIEW_REQUIRED",
        contentReviewStatus: "PENDING_HUMAN",
      },
    ]);
    await service.approveVersionGates(
      revisedImported.versionId,
      {
        contentReviewStatus: "APPROVED",
        angoffStatus: "APPROVED",
        pilotStatus: "APPROVED",
        sourceReviewStatus: "CURRENT",
        passScore: 85,
        reviewReference: "integration-review-published-recovery",
      },
      adminId,
    );
    expect(
      await prisma.assessmentVersion.findUnique({
        where: { id: revisedImported.versionId },
        select: {
          status: true,
          sourceReviewStatus: true,
          contentReviewStatus: true,
        },
      }),
    ).toEqual({
      status: "PUBLISHED",
      sourceReviewStatus: "CURRENT",
      contentReviewStatus: "APPROVED",
    });
    await completePilot(secondImported.versionId, "integration-review-2027-H1");
    await service.publishVersion(secondImported.versionId, adminId);
    expect(
      await prisma.assessmentVersion.findUnique({
        where: { id: revisedImported.versionId },
        select: { status: true, cycle: { select: { status: true } } },
      }),
    ).toEqual({ status: "RETIRED", cycle: { status: "CLOSED" } });
    const overview = await service.overview(assessmentSlug, employeeId);
    expect(overview.status).toBe("DAILY_LIMIT_REACHED");
    await expect(
      service.createAttempt(
        assessmentSlug,
        { idempotencyKey: "integration-attempt-key-0005" },
        employeeId,
      ),
    ).rejects.toMatchObject({ status: 403 });
    await service.retireVersion(secondImported.versionId, adminId);
    expect(await service.overview(assessmentSlug, employeeId)).toMatchObject({
      status: "UNAVAILABLE",
      enabled: false,
    });
  });
});
