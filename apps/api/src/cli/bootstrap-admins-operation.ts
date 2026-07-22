import type { PrismaClient } from "@prisma/client";

export async function bootstrapAdmins(prisma: PrismaClient, names: string[]) {
  const candidates = await prisma.user.findMany({
    where: {
      displayName: { in: names },
      status: "ACTIVE",
      NOT: [
        { openId: { startsWith: "legacy:" } },
        { openId: { startsWith: "seed:" } },
      ],
    },
    select: { id: true, displayName: true, role: true },
  });
  for (const name of names) {
    const matches = candidates.filter((item) => item.displayName === name);
    if (matches.length !== 1)
      throw new Error(
        `Expected exactly one active Feishu user for administrator name; found ${matches.length}`,
      );
  }

  const changed = candidates.filter((candidate) => candidate.role !== "ADMIN");
  await prisma.$transaction(async (tx) => {
    for (const user of changed) {
      await tx.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
      await tx.auditLog.create({
        data: {
          actorId: null,
          action: "user.role.bootstrap",
          resourceType: "user",
          resourceId: user.id,
          metadata: {
            from: user.role,
            to: "ADMIN",
            source: "initial-bootstrap",
          },
        },
      });
    }
  });
  return { requested: names.length, changed: changed.length };
}
