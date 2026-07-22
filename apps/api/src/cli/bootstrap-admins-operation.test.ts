import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { bootstrapAdmins } from "./bootstrap-admins-operation.js";

function fixture(
  candidates: Array<{
    id: string;
    displayName: string;
    role: "EMPLOYEE" | "ADMIN";
  }>,
) {
  const update = vi.fn().mockResolvedValue(undefined);
  const create = vi.fn().mockResolvedValue(undefined);
  const tx = { user: { update }, auditLog: { create } };
  const prisma = {
    user: { findMany: vi.fn().mockResolvedValue(candidates) },
    $transaction: vi.fn(
      async (operation: (client: typeof tx) => Promise<void>) => operation(tx),
    ),
  } as unknown as PrismaClient;
  return { prisma, update, create };
}

describe("bootstrapAdmins", () => {
  it("promotes only non-admin uniquely matched Feishu users", async () => {
    const { prisma, update, create } = fixture([
      { id: "user-a", displayName: "Admin A", role: "EMPLOYEE" },
      { id: "user-b", displayName: "Admin B", role: "ADMIN" },
    ]);
    await expect(
      bootstrapAdmins(prisma, ["Admin A", "Admin B"]),
    ).resolves.toEqual({ requested: 2, changed: 1 });
    expect(update).toHaveBeenCalledWith({
      where: { id: "user-a" },
      data: { role: "ADMIN" },
    });
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("fails before writing when a name is ambiguous", async () => {
    const { prisma, update } = fixture([
      { id: "user-a", displayName: "Same", role: "EMPLOYEE" },
      { id: "user-b", displayName: "Same", role: "EMPLOYEE" },
    ]);
    await expect(bootstrapAdmins(prisma, ["Same"])).rejects.toThrow("found 2");
    expect(update).not.toHaveBeenCalled();
  });
});
