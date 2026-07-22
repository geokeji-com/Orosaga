import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const container = `orosaga-nginx-route-check-${process.pid}`;
const image = process.env.NGINX_CHECK_IMAGE ?? "nginx:1.28.3-alpine3.23";
const dockerBinary = process.env.DOCKER_BIN ?? "docker";

function docker(...args) {
  const result = spawnSync(dockerBinary, args, { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(
      result.error?.message ||
        result.stderr ||
        result.stdout ||
        `docker ${args[0]} failed`,
    );
  }
  return result.stdout.trim();
}

async function response(path) {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      return await fetch(`${baseUrl}${path}`, { redirect: "manual" });
    } catch (error) {
      if (attempt === 29) throw error;
      await new Promise((resolveWait) => setTimeout(resolveWait, 100));
    }
  }
  throw new Error("Nginx route check timed out");
}

let baseUrl;
try {
  docker(
    "run",
    "--detach",
    "--rm",
    "--name",
    container,
    "--add-host",
    "api:127.0.0.1",
    "--publish",
    "127.0.0.1::80",
    "--volume",
    `${resolve("apps/web/nginx.conf")}:/etc/nginx/conf.d/default.conf:ro`,
    "--volume",
    `${resolve("apps/web/dist")}:/usr/share/nginx/html:ro`,
    image,
  );
  const published = docker("port", container, "80/tcp");
  baseUrl = `http://${published}`;

  for (const [path, expected] of [
    ["/", 200],
    ["/favicon.svg", 200],
    ["/company", 200],
    ["/workflow/example", 200],
    ["/does-not-exist", 404],
    ["/workflow/too/deep", 404],
    ["/assets/missing.js", 404],
  ]) {
    const result = await response(path);
    if (result.status !== expected) {
      throw new Error(
        `${path}: expected ${expected}, received ${result.status}`,
      );
    }
    if (path === "/does-not-exist") {
      const body = await result.text();
      if (!body.includes('<div id="root"></div>')) {
        throw new Error("Unknown routes must retain the React 404 shell");
      }
    }
  }
  console.log("Nginx route status check passed");
} finally {
  spawnSync(dockerBinary, ["rm", "--force", container], { stdio: "ignore" });
}
