import { databaseSchemaFromUrl } from "@orosaga/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

export function createPrismaClient() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required");
  return new PrismaClient({
    adapter: new PrismaPg(
      {
        connectionString: databaseUrl,
        max: 1,
        connectionTimeoutMillis: 5_000,
        idleTimeoutMillis: 10_000,
      },
      { schema: databaseSchemaFromUrl(databaseUrl) },
    ),
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
