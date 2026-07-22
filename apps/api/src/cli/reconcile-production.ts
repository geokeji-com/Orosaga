import { runOperation } from "./prisma.js";
import { assessProductionState } from "./reconcile-production-operation.js";

void runOperation(async (prisma) => {
  const [
    activeEmployees,
    activeLegacyUsers,
    assets,
    camps,
    campTotals,
    realSourceCamps,
    systemLinks,
    workflowStages,
    doneItems,
    admins,
    unsafeLinksDisabled,
    freshRealSources,
    latestOrganizationSync,
    latestWikiSync,
  ] = await Promise.all([
    prisma.employeeProfile.count({ where: { user: { status: "ACTIVE" } } }),
    prisma.user.count({
      where: { status: "ACTIVE", openId: { startsWith: "legacy:" } },
    }),
    prisma.asset.count({ where: { objectKey: { startsWith: "team/" } } }),
    prisma.camp.count({ where: { enabled: true } }),
    prisma.camp.aggregate({
      where: { enabled: true },
      _sum: { legacyDescendantCount: true },
    }),
    prisma.camp.count({
      where: {
        enabled: true,
        source: { enabled: true, spaceId: { not: "legacy" } },
      },
    }),
    prisma.systemLink.count(),
    prisma.workflowStage.count(),
    prisma.workflowItem.count({ where: { itemType: "DONE" } }),
    prisma.user.count({ where: { status: "ACTIVE", role: "ADMIN" } }),
    prisma.systemLink.count({
      where: {
        title: { in: ["YiShanOS 运营工作台", "报告生成系统"] },
        enabled: false,
      },
    }),
    prisma.knowledgeSource.count({
      where: {
        enabled: true,
        spaceId: { not: "legacy" },
        lastSuccessAt: { not: null },
      },
    }),
    prisma.syncRun.findFirst({
      where: { kind: "ORGANIZATION", status: "SUCCEEDED" },
      orderBy: { finishedAt: "desc" },
      select: { discovered: true, finishedAt: true },
    }),
    prisma.syncRun.findFirst({
      where: { kind: "WIKI", status: "SUCCEEDED" },
      orderBy: { finishedAt: "desc" },
      select: { discovered: true, finishedAt: true },
    }),
  ]);
  const actual = {
    activeEmployees,
    activeLegacyUsers,
    assets,
    camps,
    legacyDescendants: campTotals._sum.legacyDescendantCount ?? 0,
    realSourceCamps,
    systemLinks,
    workflowStages,
    doneItems,
    admins,
    unsafeLinksDisabled,
    freshRealSources,
  };
  const report = assessProductionState(
    actual,
    latestOrganizationSync,
    latestWikiSync,
  );
  console.log(
    JSON.stringify({
      operation: "reconcile-production",
      ...report,
    }),
  );
  if (!report.ok) throw new Error("Production counts do not match");
}).catch((error: unknown) => {
  console.error(
    JSON.stringify({
      operation: "reconcile-production",
      ok: false,
      error: error instanceof Error ? error.message : "unknown error",
    }),
  );
  process.exitCode = 1;
});
