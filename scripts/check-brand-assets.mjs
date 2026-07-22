import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(process.argv[2] ?? "apps/web/dist");
const html = await readFile(resolve(root, "index.html"), "utf8");
const match = html.match(
  /<link[^>]+rel=["']icon["'][^>]+href=["']([^"']*orosaga-mark-[a-zA-Z0-9_-]+\.svg)["']/,
);
if (!match?.[1])
  throw new Error("index.html must use a content-hashed Orosaga favicon");
if (html.includes("/src/assets/"))
  throw new Error("index.html contains an unbuilt source asset URL");
await access(resolve(root, match[1].replace(/^\//, "")));
await access(resolve(root, "favicon.svg"));
console.log(`Fingerprinted brand asset verified: ${match[1]}`);
