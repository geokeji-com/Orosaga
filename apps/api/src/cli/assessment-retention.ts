import {
  applyAssessmentRetention,
  planAssessmentRetention,
} from "../assessment/assessment-retention.js";
import { calculateQuotaDate } from "../assessment/assessment-rules.js";
import { runOperation } from "./prisma.js";

const valueAfter = (name: string, fallback?: string) => {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : fallback;
  if (!value || value.startsWith("--")) throw new Error(`${name} is required`);
  return value;
};

const main = async () => {
  const assessmentSlug = valueAfter("--assessment");
  const todayRaw = calculateQuotaDate(new Date());
  const asOfRaw = valueAfter("--as-of", todayRaw);
  const asOf = new Date(`${asOfRaw}T00:00:00.000Z`);
  if (
    Number.isNaN(asOf.getTime()) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(asOfRaw) ||
    asOf.toISOString().slice(0, 10) !== asOfRaw
  )
    throw new Error("--as-of must use YYYY-MM-DD");
  if (asOfRaw > todayRaw) throw new Error("--as-of cannot be in the future");
  const apply = process.argv.includes("--apply");
  const confirmation = process.argv.includes("--confirm-assessment")
    ? valueAfter("--confirm-assessment")
    : null;
  if (apply && confirmation !== assessmentSlug)
    throw new Error("执行清理时必须用 --confirm-assessment 重复测评 slug");
  const expectedDigest = apply ? valueAfter("--confirm-digest") : null;
  if (expectedDigest && !/^[0-9a-f]{64}$/.test(expectedDigest))
    throw new Error("--confirm-digest must be a 64-character SHA-256 digest");
  const maxTargetsRaw = apply ? valueAfter("--max-targets") : null;
  const maxTargets = maxTargetsRaw ? Number(maxTargetsRaw) : null;
  if (
    apply &&
    (maxTargets === null || !Number.isSafeInteger(maxTargets) || maxTargets < 0)
  )
    throw new Error("--max-targets must be a non-negative integer");

  await runOperation(async (prisma) => {
    const { assessment, plan } = await planAssessmentRetention(prisma, {
      assessmentSlug,
      asOf,
      detailMonths: 12,
      summaryMonths: 24,
    });
    const preview = {
      operation: "assessment-retention",
      mode: apply ? "APPLY" : "PREVIEW",
      assessmentSlug,
      asOf: asOf.toISOString(),
      detailCutoff: plan.detailCutoff.toISOString(),
      summaryCutoff: plan.summaryCutoff.toISOString(),
      detailAttempts: plan.redactDetailAttemptIds.length,
      summaryAttempts: plan.deleteSummaryAttemptIds.length,
      totalTargets:
        plan.redactDetailAttemptIds.length +
        plan.deleteSummaryAttemptIds.length,
      targetDigest: plan.targetDigest,
    };
    if (!apply) {
      console.log(JSON.stringify({ ...preview, ok: true }));
      return;
    }
    const result = await applyAssessmentRetention(prisma, {
      assessmentId: assessment.id,
      assessmentSlug,
      asOf,
      detailMonths: 12,
      summaryMonths: 24,
      expectedDigest: expectedDigest!,
      maxTargets: maxTargets!,
    });
    console.log(JSON.stringify({ ...preview, ok: true, result }));
  });
};

void main().catch((error: unknown) => {
  console.error(
    JSON.stringify({
      operation: "assessment-retention",
      ok: false,
      error: error instanceof Error ? error.message : "unknown error",
    }),
  );
  process.exitCode = 1;
});
