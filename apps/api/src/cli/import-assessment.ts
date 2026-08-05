import { readFile, realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import { importAssessmentPack } from "../assessment/assessment-import.js";
import { validateAssessmentPack } from "../assessment/assessment-pack.js";
import { runOperation } from "./prisma.js";

const valueAfter = (name: string) => {
  const index = process.argv.indexOf(name);
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (!value || value.startsWith("--")) throw new Error(`${name} is required`);
  return value;
};

const main = async () => {
  const importRoot = process.env.OROSAGA_ASSESSMENT_IMPORT_ROOT;
  if (!importRoot)
    throw new Error("OROSAGA_ASSESSMENT_IMPORT_ROOT is required");
  const requestedFile = valueAfter("--file");
  const cycleKey = valueAfter("--cycle");

  await runOperation(async (prisma) => {
    const root = await realpath(importRoot);
    const candidate = await realpath(
      isAbsolute(requestedFile) ? requestedFile : resolve(root, requestedFile),
    );
    const pathFromRoot = relative(root, candidate);
    if (pathFromRoot.startsWith("..") || isAbsolute(pathFromRoot))
      throw new Error("题库文件必须位于受控导入目录内");
    const raw = await readFile(candidate, "utf8");
    const validated = validateAssessmentPack(raw);
    const startsAt = new Date();
    const reviewDueAt = new Date(startsAt.getTime());
    reviewDueAt.setUTCMonth(reviewDueAt.getUTCMonth() + 6);
    const result = await importAssessmentPack(prisma, {
      pack: validated.pack,
      contentHash: validated.contentHash,
      cycleKey,
      startsAt,
      reviewDueAt,
    });
    console.log(
      JSON.stringify({
        operation: "import-assessment",
        ok: true,
        contentHash: validated.contentHash,
        summary: validated.summary,
        result,
      }),
    );
  });
};

void main().catch((error: unknown) => {
  console.error(
    JSON.stringify({
      operation: "import-assessment",
      ok: false,
      error: error instanceof Error ? error.message : "unknown error",
    }),
  );
  process.exitCode = 1;
});
