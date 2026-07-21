import { readFile } from "node:fs/promises";

const migration = process.argv[2];
if (!migration)
  throw new Error("usage: check-sql-comments.mjs <migration.sql>");

const sql = await readFile(migration, "utf8");
const tables = [...sql.matchAll(/CREATE TABLE "([^"]+)" \(([^;]+?)\n\);/gs)];
const missing = [];

for (const [, table, body] of tables) {
  if (!sql.includes(`COMMENT ON TABLE "${table}"`))
    missing.push(`${table} (table)`);
  for (const match of body.matchAll(/^\s+"([^"]+)"/gm)) {
    const column = match[1];
    if (!sql.includes(`COMMENT ON COLUMN "${table}"."${column}"`)) {
      missing.push(`${table}.${column}`);
    }
  }
}

if (missing.length)
  throw new Error(`Missing SQL comments: ${missing.join(", ")}`);
console.log(`SQL comments verified for ${tables.length} tables.`);
