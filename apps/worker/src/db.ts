import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Client } from "pg";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");
export const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

export type AdvisoryLockClient = Pick<Client, "connect" | "query" | "end">;

const createAdvisoryLockClient = (): AdvisoryLockClient =>
  new Client({ connectionString: databaseUrl });

export async function withAdvisoryLock<T>(
  name: string,
  task: () => Promise<T>,
  createClient: () => AdvisoryLockClient = createAdvisoryLockClient,
): Promise<T | null> {
  const client = createClient();
  let connected = false;
  let locked = false;
  try {
    await client.connect();
    connected = true;
    const result = await client.query<{ locked: boolean }>(
      "SELECT pg_try_advisory_lock(hashtext($1)) AS locked",
      [name],
    );
    locked = result.rows[0]?.locked === true;
    if (!locked) return null;
    return await task();
  } finally {
    if (connected) {
      try {
        if (locked)
          await client.query(
            "SELECT pg_advisory_unlock(hashtext($1)) AS unlocked",
            [name],
          );
      } finally {
        await client.end();
      }
    }
  }
}
