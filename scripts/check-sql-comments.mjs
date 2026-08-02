import { readFile } from "node:fs/promises";

const migrations = process.argv.slice(2);
if (!migrations.length)
  throw new Error("usage: check-sql-comments.mjs <migration.sql> [...]");

const missing = [];
let tableCount = 0;

for (const migration of migrations) {
  const sql = await readFile(migration, "utf8");
  const tables = [...sql.matchAll(/CREATE TABLE "([^"]+)" \(([^;]+?)\n\);/gs)];
  tableCount += tables.length;
  for (const [, table, body] of tables) {
    if (!sql.includes(`COMMENT ON TABLE "${table}"`))
      missing.push(`${migration}: ${table} (table)`);
    for (const match of body.matchAll(/^\s+"([^"]+)"/gm)) {
      const column = match[1];
      if (!sql.includes(`COMMENT ON COLUMN "${table}"."${column}"`)) {
        missing.push(`${migration}: ${table}.${column}`);
      }
    }
  }
}

if (missing.length)
  throw new Error(`Missing SQL comments: ${missing.join(", ")}`);
console.log(
  `SQL comments verified for ${tableCount} tables in ${migrations.length} migrations.`,
);
