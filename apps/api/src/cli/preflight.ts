import { Client } from "pg";
import { requirePrivateDatabaseAddresses } from "./database-network.js";

type Check = { name: string; ok: boolean; detail: string };

async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required");
  const requireSchema = process.argv.includes("--require-schema");
  let url: URL;
  try {
    url = new URL(databaseUrl);
  } catch {
    throw new Error("DATABASE_URL must be a valid URL");
  }
  const checks: Check[] = [];
  checks.push({
    name: "database-schema-parameter",
    ok: url.searchParams.get("schema") === "orosaga",
    detail: url.searchParams.get("schema") ?? "missing",
  });
  checks.push({
    name: "database-ssl-mode",
    ok: url.searchParams.get("sslmode") === "disable",
    detail: url.searchParams.get("sslmode") ?? "missing",
  });
  checks.push({
    name: "database-plaintext-opt-in",
    ok: process.env.DATABASE_ALLOW_PLAINTEXT_INTERNAL === "true",
    detail:
      process.env.DATABASE_ALLOW_PLAINTEXT_INTERNAL === "true"
        ? "enabled"
        : "disabled",
  });
  checks.push({
    name: "database-rds-hostname",
    ok: url.hostname.endsWith(".pg.rds.aliyuncs.com"),
    detail: url.hostname.endsWith(".pg.rds.aliyuncs.com")
      ? "Alibaba Cloud RDS"
      : "rejected",
  });
  try {
    const addresses = await requirePrivateDatabaseAddresses(url.hostname);
    checks.push({
      name: "database-private-addresses",
      ok: true,
      detail: `${addresses.length} private address(es)`,
    });
  } catch (error) {
    checks.push({
      name: "database-private-addresses",
      ok: false,
      detail: error instanceof Error ? error.message : "resolution failed",
    });
  }
  if (checks.some((check) => !check.ok)) {
    for (const check of checks) console.log(JSON.stringify(check));
    process.exitCode = 1;
    return;
  }

  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    const result = await client.query<{
      version: string;
      database_name: string;
      ssl: boolean;
      schema_exists: boolean;
      schema_ready: boolean;
      trgm_available: boolean;
    }>(`
      SELECT
        current_setting('server_version') AS version,
        current_database() AS database_name,
        COALESCE((SELECT ssl FROM pg_stat_ssl WHERE pid = pg_backend_pid()), false) AS ssl,
        EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'orosaga') AS schema_exists,
        CASE
          WHEN EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'orosaga')
            THEN has_schema_privilege(current_user, 'orosaga', 'USAGE,CREATE')
          ELSE has_database_privilege(current_user, current_database(), 'CREATE')
        END AS schema_ready,
        EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'pg_trgm') AS trgm_available
    `);
    const row = result.rows[0];
    if (!row) throw new Error("RDS preflight returned no row");
    checks.push(
      {
        name: "postgres-version",
        ok: row.version.startsWith("16."),
        detail: row.version,
      },
      {
        name: "database-name",
        ok: row.database_name === "yishan_verse",
        detail: row.database_name,
      },
      { name: "tls-disabled", ok: !row.ssl, detail: String(!row.ssl) },
      {
        name: "schema-exists",
        ok: !requireSchema || row.schema_exists,
        detail: String(row.schema_exists),
      },
      {
        name: "schema-ready",
        ok: row.schema_ready,
        detail: String(row.schema_ready),
      },
      {
        name: "pg-trgm-available",
        ok: row.trgm_available,
        detail: String(row.trgm_available),
      },
    );
  } finally {
    await client.end();
  }

  for (const check of checks) console.log(JSON.stringify(check));
  if (checks.some((check) => !check.ok)) process.exitCode = 1;
}

void main().catch((error: unknown) => {
  console.error(
    JSON.stringify({
      name: "preflight",
      ok: false,
      detail: error instanceof Error ? error.message : "unknown error",
    }),
  );
  process.exitCode = 1;
});
