import type { PrismaClient } from "@prisma/client";

export type AssessmentManagerAssignment = {
  actorId: string;
  userIds: string[];
  action: "grant" | "revoke";
};

export async function assignAssessmentManagers(
  prisma: PrismaClient,
  input: AssessmentManagerAssignment,
) {
  if (input.userIds.length !== 3)
    throw new Error("Exactly three assessment manager user IDs are required");
  if (new Set(input.userIds).size !== input.userIds.length)
    throw new Error("Assessment manager user IDs must be unique");
  if (input.userIds.includes(input.actorId))
    throw new Error("The administrator cannot be an assignment target");

  const from = input.action === "grant" ? "EMPLOYEE" : "ASSESSMENT_MANAGER";
  const to = input.action === "grant" ? "ASSESSMENT_MANAGER" : "EMPLOYEE";
  return prisma.$transaction(async (tx) => {
    const users = await tx.user.findMany({
      where: { id: { in: [input.actorId, ...input.userIds] } },
      select: { id: true, role: true, status: true },
    });
    const byId = new Map(users.map((user) => [user.id, user]));
    const actor = byId.get(input.actorId);
    if (!actor || actor.status !== "ACTIVE" || actor.role !== "ADMIN")
      throw new Error("The assignment actor must be an active administrator");

    for (const userId of input.userIds) {
      const user = byId.get(userId);
      if (!user || user.status !== "ACTIVE" || user.role !== from)
        throw new Error(
          "Each assignment target must match the expected active role",
        );
    }

    for (const userId of input.userIds) {
      await tx.user.update({ where: { id: userId }, data: { role: to } });
      await tx.auditLog.create({
        data: {
          actorId: input.actorId,
          action: "user.role.assessment-manager",
          resourceType: "user",
          resourceId: userId,
          metadata: { from, to, source: "assessment-manager-cli" },
        },
      });
    }
    return {
      operation: "assign-assessment-managers",
      action: input.action,
      changed: input.userIds.length,
      userIds: input.userIds,
    };
  });
}
