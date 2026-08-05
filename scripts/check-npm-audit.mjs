import { spawnSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";
import { extname, join } from "node:path";

const exception = {
  advisoryUrl: "https://github.com/advisories/GHSA-qwww-vcr4-c8h2",
  source: 1124282,
  packageName: "react-router",
  version: "7.18.2",
  expiresOn: "2026-09-30",
};

const today = new Date().toISOString().slice(0, 10);
if (today > exception.expiresOn) {
  throw new Error(
    `React Router audit exception expired on ${exception.expiresOn}; review the upstream fix before continuing`,
  );
}

const lock = JSON.parse(readFileSync("package-lock.json", "utf8"));
const installedVersion = lock.packages?.["node_modules/react-router"]?.version;
if (installedVersion !== exception.version) {
  throw new Error(
    `React Router audit exception only covers ${exception.version}; found ${installedVersion ?? "unknown"}`,
  );
}

const sourceExtensions = new Set([".js", ".jsx", ".mjs", ".ts", ".tsx"]);
const ignoredDirectories = new Set([
  "coverage",
  "dist",
  "node_modules",
  "playwright-report",
  "test-results",
]);
const rscIndicators = [
  /from\s+["']react-router(?:\/dom-export|\/dom-ssr|\/rsc|\/server)?["']/,
  /\b(?:RSCStaticRouter|ServerRouter|createCallServer|decodeReply|encodeReply|getRSCStream|routeRSCServerRequest)\b/,
];

const sourceFiles = [];
const collectSourceFiles = (directory) => {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory() && !ignoredDirectories.has(entry.name))
      collectSourceFiles(path);
    else if (sourceExtensions.has(extname(entry.name))) sourceFiles.push(path);
  }
};
collectSourceFiles("apps");

for (const path of sourceFiles) {
  const source = readFileSync(path, "utf8");
  if (rscIndicators.some((indicator) => indicator.test(source))) {
    throw new Error(
      `React Router RSC usage detected in ${path}; the audit exception is no longer applicable`,
    );
  }
}

const audit = spawnSync(
  "npm",
  ["audit", "--json", "--registry=https://registry.npmjs.org"],
  { encoding: "utf8", maxBuffer: 10 * 1024 * 1024 },
);
if (audit.error) throw audit.error;

let report;
try {
  report = JSON.parse(audit.stdout);
} catch {
  throw new Error(`Unable to parse npm audit output: ${audit.stderr}`);
}
if (report.auditReportVersion !== 2 || !report.vulnerabilities) {
  throw new Error(
    `npm audit did not return a complete version 2 report: ${JSON.stringify(report.error ?? report)}`,
  );
}

const blocking = Object.entries(report.vulnerabilities ?? {}).filter(
  ([, vulnerability]) =>
    vulnerability.severity === "high" || vulnerability.severity === "critical",
);
const isApprovedException = ([name, vulnerability]) => {
  if (name === exception.packageName) {
    return (
      vulnerability.via.length > 0 &&
      vulnerability.via.every(
        (item) =>
          typeof item === "object" &&
          item.source === exception.source &&
          item.url === exception.advisoryUrl,
      )
    );
  }
  if (name === "react-router-dom") {
    return (
      vulnerability.via.length > 0 &&
      vulnerability.via.every((item) => item === exception.packageName)
    );
  }
  return false;
};
const unexpected = blocking.filter((entry) => !isApprovedException(entry));

if (unexpected.length > 0) {
  const details = unexpected
    .map(([name, vulnerability]) => `${name} (${vulnerability.severity})`)
    .join(", ");
  throw new Error(
    `npm audit found unapproved high/critical findings: ${details}`,
  );
}

if (blocking.length > 0) {
  console.log(
    `npm audit passed with one RSC-only exception through ${exception.expiresOn}: ${exception.advisoryUrl}`,
  );
} else {
  console.log("npm audit passed with no high/critical findings.");
}
