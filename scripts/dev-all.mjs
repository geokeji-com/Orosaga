import { spawn } from "node:child_process";

const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error("dev:all must be started through npm");

const workspaces = ["@orosaga/web", "@orosaga/api", "@orosaga/worker"];
const children = workspaces.map((workspace) =>
  spawn(process.execPath, [npmCli, "run", "dev", "-w", workspace], {
    stdio: "inherit",
    env: process.env,
  }),
);

let stopping = false;
function stop(signal = "SIGTERM") {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill(signal);
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => stop(signal));
}

for (const child of children) {
  child.on("exit", (code, signal) => {
    if (!stopping && (code !== 0 || signal)) {
      process.exitCode = code ?? 1;
      stop();
    }
  });
}
