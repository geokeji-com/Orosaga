import { prisma } from "./db.js";
import { parseWorkerEnv } from "@orosaga/config";
import { FeishuRequestError } from "./feishu-client.js";
import { runOrganizationSync } from "./organization-sync.js";
import { runWikiSync } from "./wiki-sync.js";

parseWorkerEnv();

let working = false;

async function fail(runId: string, error: unknown) {
  const message =
    error instanceof Error ? error.message.slice(0, 500) : "Unknown sync error";
  await prisma.syncRun.update({
    where: { id: runId },
    data: { status: "FAILED", error: message, finishedAt: new Date() },
  });
  const authFailure =
    error instanceof FeishuRequestError && [401, 403].includes(error.status);
  console.error(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "error",
      event: authFailure ? "feishu_sync_auth_alert" : "feishu_sync_failed",
      runId,
      message,
    }),
  );
}

async function runPending() {
  if (working) return;
  working = true;
  try {
    const runs = await prisma.syncRun.findMany({
      where: { status: "RUNNING" },
      orderBy: { startedAt: "asc" },
      take: 10,
    });
    for (const run of runs) {
      try {
        if (run.kind === "ORGANIZATION") await runOrganizationSync(run.id);
        else await runWikiSync(run.id);
      } catch (error) {
        await fail(run.id, error);
      }
    }
  } finally {
    working = false;
  }
}

async function schedule() {
  for (const kind of ["ORGANIZATION", "WIKI"] as const) {
    const active = await prisma.syncRun.count({
      where: { kind, status: "RUNNING" },
    });
    if (!active)
      await prisma.syncRun.create({ data: { kind, status: "RUNNING" } });
  }
  await runPending();
}

const poller = setInterval(() => void runPending(), 60_000);
const scheduler = setInterval(
  () => void schedule(),
  Number(process.env.SYNC_INTERVAL_MINUTES ?? 30) * 60_000,
);
void schedule();

async function shutdown() {
  clearInterval(poller);
  clearInterval(scheduler);
  await prisma.$disconnect();
  process.exit(0);
}
process.on("SIGTERM", () => void shutdown());
process.on("SIGINT", () => void shutdown());
