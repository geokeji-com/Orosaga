import { bootstrapAdmins } from "./bootstrap-admins-operation.js";
import { runOperation } from "./prisma.js";

function requestedNames() {
  const names = (process.env.OROSAGA_INITIAL_ADMIN_NAMES ?? "")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);
  if (!names.length) throw new Error("OROSAGA_INITIAL_ADMIN_NAMES is required");
  if (new Set(names).size !== names.length)
    throw new Error("Initial administrator names must be unique");
  return names;
}

void runOperation(async (prisma) => {
  const result = await bootstrapAdmins(prisma, requestedNames());
  console.log(JSON.stringify({ operation: "bootstrap-admins", ...result }));
}).catch((error: unknown) => {
  console.error(
    JSON.stringify({
      operation: "bootstrap-admins",
      ok: false,
      error: error instanceof Error ? error.message : "unknown error",
    }),
  );
  process.exitCode = 1;
});
