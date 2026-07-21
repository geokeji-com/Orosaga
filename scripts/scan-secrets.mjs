import { readdir, readFile, stat } from "node:fs/promises";
import { resolve, relative } from "node:path";

const root = process.cwd();
const excluded = new Set([
  ".git",
  "node_modules",
  "dist",
  "coverage",
  "playwright-report",
  "test-results",
]);
const patterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /AKIA[0-9A-Z]{16}/,
  /(?:app_secret|client_secret|session_secret)\s*[:=]\s*['"][A-Za-z0-9_\-]{24,}['"]/i,
  /postgres(?:ql)?:\/\/[^:\s]+:[^@\s]{12,}@/,
];
const hits = [];
async function walk(path) {
  for (const name of await readdir(path)) {
    if (excluded.has(name)) continue;
    const target = resolve(path, name);
    const info = await stat(target);
    if (info.isDirectory()) await walk(target);
    else if (info.size < 2_000_000 && !/\.(png|jpg|zip|lock)$/.test(name)) {
      const text = await readFile(target, "utf8");
      if (patterns.some((pattern) => pattern.test(text)))
        hits.push(relative(root, target));
    }
  }
}
await walk(root);
if (hits.length) throw new Error(`Potential secrets found: ${hits.join(", ")}`);
console.log("Repository secret scan passed.");
