import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

export function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required");
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  });
}

export async function runOperation(
  operation: (prisma: PrismaClient) => Promise<void>,
) {
  const prisma = createPrismaClient();
  try {
    await operation(prisma);
  } finally {
    await prisma.$disconnect();
  }
}
