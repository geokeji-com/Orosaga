import { readdir, stat } from "node:fs/promises";
import { resolve } from "node:path";

const assets = resolve(process.argv[2] ?? "apps/web/dist/assets");
const limits = { ".js": 500 * 1024, ".css": 220 * 1024 };
const failures = [];
for (const name of await readdir(assets)) {
  const extension = Object.keys(limits).find((item) => name.endsWith(item));
  if (!extension) continue;
  const bytes = (await stat(resolve(assets, name))).size;
  if (bytes > limits[extension])
    failures.push(`${name}: ${bytes} > ${limits[extension]}`);
}
if (failures.length)
  throw new Error(`Bundle budget exceeded:\n${failures.join("\n")}`);
console.log("Bundle budget passed.");
