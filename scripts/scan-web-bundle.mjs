import { readdir, readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(process.argv[2] ?? "apps/web/dist");
const files = [];
async function walk(path) {
  for (const name of await readdir(path)) {
    const target = resolve(path, name);
    if ((await stat(target)).isDirectory()) await walk(target);
    else files.push(target);
  }
}
await walk(root);
const text = (
  await Promise.all(
    files
      .filter((file) => /\.(js|css|html)$/.test(file))
      .map((file) => readFile(file, "utf8")),
  )
).join("\n");
const forbidden = [
  ["migration source path", [/seed\/(?:legacy|private)/]],
  ["Feishu node token", [/[A-Za-z0-9]{20,}\/wiki\//, /nodeToken/]],
  ["local URL", [/localhost:\d+/, /127\.0\.0\.1:\d+/]],
  ["bare IPv4 URL", [/https?:\/\/(?:\d{1,3}\.){3}\d{1,3}/]],
  ["private image path", [/\/team\//]],
];
const hits = [];
for (const [kind, patterns] of forbidden) {
  for (const pattern of patterns)
    if (
      typeof pattern === "string" ? text.includes(pattern) : pattern.test(text)
    )
      hits.push(`${kind}: ${String(pattern)}`);
}
if (hits.length)
  throw new Error(`Sensitive values found in web bundle:\n${hits.join("\n")}`);
console.log(`Sensitive bundle scan passed across ${files.length} files.`);
