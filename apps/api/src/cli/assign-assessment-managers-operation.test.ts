import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { assignAssessmentManagers } from "./assign-assessment-managers-operation.js";

const actorId = "00000000-0000-4000-8000-000000000001";
const targetIds: [string, string, string] = [
  "00000000-0000-4000-8000-000000000002",
  "00000000-0000-4000-8000-000000000003",
  "00000000-0000-4000-8000-000000000004",
];

function fixture(
  users = [
    { id: actorId, role: "ADMIN", status: "ACTIVE" },
    ...targetIds.map((id) => ({ id, role: "EMPLOYEE", status: "ACTIVE" })),
  ],
) {
  const findMany = vi.fn().mockResolvedValue(users);
  const update = vi.fn().mockResolvedValue(undefined);
  const create = vi.fn().mockResolvedValue(undefined);
  const tx = { user: { findMany, update }, auditLog: { create } };
  const prisma = {
    $transaction: vi.fn(
      async (operation: (client: typeof tx) => Promise<unknown>) =>
        operation(tx),
    ),
  } as unknown as PrismaClient;
  return { prisma, update, create };
}

describe("assignAssessmentManagers", () => {
  it("assigns exactly three active employee IDs and records audit entries", async () => {
    const { prisma, update, create } = fixture();
    await expect(
      assignAssessmentManagers(prisma, {
        actorId,
        userIds: targetIds,
        action: "grant",
      }),
    ).resolves.toEqual({
      operation: "assign-assessment-managers",
      action: "grant",
      changed: 3,
      userIds: targetIds,
    });
    expect(update).toHaveBeenCalledTimes(3);
    expect(create).toHaveBeenCalledTimes(3);
    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          actorId,
          action: "user.role.assessment-manager",
          metadata: {
            from: "EMPLOYEE",
            to: "ASSESSMENT_MANAGER",
            source: "assessment-manager-cli",
          },
        }),
      }),
    );
  });

  it("rejects duplicate targets before opening a transaction", async () => {
    const { prisma } = fixture();
    await expect(
      assignAssessmentManagers(prisma, {
        actorId,
        userIds: [targetIds[0], targetIds[0], targetIds[2]],
        action: "grant",
      }),
    ).rejects.toThrow("must be unique");
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});
