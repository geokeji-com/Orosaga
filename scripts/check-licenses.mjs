import { readFile } from "node:fs/promises";

const lock = JSON.parse(await readFile("package-lock.json", "utf8"));
const forbidden = /^(?:AGPL|GPL|SSPL)(?:-|$)/i;
const violations = [];
for (const [path, metadata] of Object.entries(lock.packages ?? {})) {
  if (
    path &&
    typeof metadata.license === "string" &&
    forbidden.test(metadata.license)
  )
    violations.push(`${path}: ${metadata.license}`);
}
if (violations.length)
  throw new Error(`Forbidden dependency licenses:\n${violations.join("\n")}`);
console.log("Dependency license policy passed.");
