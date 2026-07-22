import { runOperation } from "./prisma.js";

const expected = {
  activeEmployees: 30,
  assets: 31,
  camps: 16,
  legacyDescendants: 253,
  systemLinks: 7,
  workflowStages: 6,
  doneItems: 18,
  admins: 2,
};

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
  };
  const checks = [
    actual.activeEmployees === expected.activeEmployees,
    actual.activeLegacyUsers === 0,
    actual.assets === expected.assets,
    actual.camps === expected.camps,
    actual.legacyDescendants === expected.legacyDescendants,
    actual.realSourceCamps === expected.camps,
    actual.systemLinks === expected.systemLinks,
    actual.workflowStages === expected.workflowStages,
    actual.doneItems === expected.doneItems,
    actual.admins >= expected.admins,
  ];
  console.log(
    JSON.stringify({
      operation: "reconcile-production",
      ok: checks.every(Boolean),
      counts: actual,
    }),
  );
  if (!checks.every(Boolean)) throw new Error("Production counts do not match");
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
