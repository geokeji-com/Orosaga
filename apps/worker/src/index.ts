import { prisma } from "./db.js";
import { parseWorkerEnv } from "@orosaga/config";
import { FeishuRequestError } from "./feishu-client.js";
import { runOrganizationSync } from "./organization-sync.js";
import { runWikiSync } from "./wiki-sync.js";
import {
  databaseRetryDelayMs,
  isDatabaseConnectionError,
  safeWorkerError,
} from "./worker-errors.js";

parseWorkerEnv();

let working = false;
let scheduling = false;
let databaseFailures = 0;
let retryTimer: NodeJS.Timeout | undefined;

async function fail(runId: string, error: unknown) {
  const message = safeWorkerError(error);
  try {
    await prisma.syncRun.update({
      where: { id: runId },
      data: { status: "FAILED", error: message, finishedAt: new Date() },
    });
  } catch (persistenceError) {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "error",
        event: "sync_run_failure_unpersisted",
        runId,
        message: safeWorkerError(persistenceError),
      }),
    );
    return persistenceError;
  }
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
  return null;
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
        const persistenceError = await fail(run.id, error);
        if (persistenceError) throw persistenceError;
      }
    }
  } finally {
    working = false;
  }
}

async function schedule() {
  if (scheduling) return;
  scheduling = true;
  try {
    for (const kind of ["ORGANIZATION", "WIKI"] as const) {
      const active = await prisma.syncRun.count({
        where: { kind, status: "RUNNING" },
      });
      if (!active)
        await prisma.syncRun.create({ data: { kind, status: "RUNNING" } });
    }
    await runPending();
  } finally {
    scheduling = false;
  }
}

function scheduleDatabaseRetry(error: unknown) {
  if (retryTimer || !isDatabaseConnectionError(error)) return;
  databaseFailures += 1;
  const delayMs = databaseRetryDelayMs(databaseFailures);
  console.error(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: "error",
      event: "worker_database_retry_scheduled",
      delayMs,
      message: safeWorkerError(error),
    }),
  );
  retryTimer = setTimeout(() => {
    retryTimer = undefined;
    void runSafely("database-retry", schedule);
  }, delayMs);
}

async function runSafely(name: string, operation: () => Promise<void>) {
  try {
    await operation();
    databaseFailures = 0;
  } catch (error) {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "error",
        event: "worker_cycle_failed",
        cycle: name,
        message: safeWorkerError(error),
      }),
    );
    scheduleDatabaseRetry(error);
  }
}

const poller = setInterval(() => void runSafely("poll", runPending), 60_000);
const scheduler = setInterval(
  () => void runSafely("schedule", schedule),
  Number(process.env.SYNC_INTERVAL_MINUTES ?? 30) * 60_000,
);
void runSafely("startup", schedule);

async function shutdown() {
  clearInterval(poller);
  clearInterval(scheduler);
  if (retryTimer) clearTimeout(retryTimer);
  await prisma.$disconnect();
  process.exit(0);
}
process.on("SIGTERM", () => void shutdown());
process.on("SIGINT", () => void shutdown());
