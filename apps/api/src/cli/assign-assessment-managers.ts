import { z } from "zod";
import {
  assignAssessmentManagers,
  type AssessmentManagerAssignment,
} from "./assign-assessment-managers-operation.js";
import { runOperation } from "./prisma.js";

function valuesAfter(flag: string) {
  return process.argv.flatMap((value, index) =>
    value === flag ? [process.argv[index + 1]] : [],
  );
}

function requiredValue(flag: string) {
  const values = valuesAfter(flag);
  if (values.length !== 1 || !values[0] || values[0].startsWith("--"))
    throw new Error(`${flag} is required exactly once`);
  return values[0];
}

function parseInput(): AssessmentManagerAssignment {
  const actorId = z.string().uuid().parse(requiredValue("--actor-id"));
  const action = z.enum(["grant", "revoke"]).parse(requiredValue("--action"));
  const userIds = valuesAfter("--user-id").map((value) =>
    z.string().uuid().parse(value),
  );
  return { actorId, action, userIds };
}

void runOperation(async (prisma) => {
  const result = await assignAssessmentManagers(prisma, parseInput());
  console.log(JSON.stringify({ ok: true, ...result }));
}).catch((error: unknown) => {
  console.error(
    JSON.stringify({
      operation: "assign-assessment-managers",
      ok: false,
      error: error instanceof Error ? error.message : "unknown error",
    }),
  );
  process.exitCode = 1;
});
