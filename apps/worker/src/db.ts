import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");
export const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});

export async function withAdvisoryLock<T>(
  name: string,
  task: () => Promise<T>,
): Promise<T | null> {
  const rows = await prisma.$queryRaw<
    Array<{ locked: boolean }>
  >`SELECT pg_try_advisory_lock(hashtext(${name})) AS locked`;
  if (!rows[0]?.locked) return null;
  try {
    return await task();
  } finally {
    await prisma.$queryRaw`SELECT pg_advisory_unlock(hashtext(${name}))`;
  }
}
