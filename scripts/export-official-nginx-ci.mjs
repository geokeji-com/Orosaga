import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

if (process.env.GITHUB_ACTIONS !== "true") {
  console.log("Official Nginx export skipped outside GitHub Actions.");
  process.exit(0);
}

const image = "nginx:1.28.3-alpine3.23";
const outputDir = resolve("apps/web/dist");
const tarPath = resolve(outputDir, "nginx-1.28.3-alpine3.23-linux-amd64.tar");

mkdirSync(outputDir, { recursive: true });
execFileSync("docker", ["pull", "--platform", "linux/amd64", image], {
  stdio: "inherit",
});
const repoDigest = execFileSync(
  "docker",
  ["image", "inspect", image, "--format", "{{index .RepoDigests 0}}"],
  { encoding: "utf8" },
).trim();
const imageId = execFileSync(
  "docker",
  ["image", "inspect", image, "--format", "{{.Id}}"],
  { encoding: "utf8" },
).trim();
execFileSync("docker", ["save", "-o", tarPath, image], { stdio: "inherit" });
writeFileSync(
  resolve(outputDir, "nginx-image.json"),
  `${JSON.stringify({ image, imageId, platform: "linux/amd64", repoDigest, source: "Docker Hub official library/nginx" }, null, 2)}\n`,
);
console.log(`Exported ${image} (${repoDigest}) to ${tarPath}.`);
