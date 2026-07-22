import { describe, expect, it, vi } from "vitest";

vi.mock("./db.js", () => ({ prisma: {}, withAdvisoryLock: vi.fn() }));

import { runOrganizationSync } from "./organization-sync.js";

const runWithLock = async <T>(_name: string, task: () => Promise<T>) => task();

function organizationClient(users = [{ open_id: "ou-alice", name: "Alice" }]) {
  return {
    get: vi.fn(
      async (
        path: string,
        _schema: unknown,
        params: Record<string, string>,
      ) => {
        if (path.endsWith("/departments/0/children")) {
          if (!params.page_token)
            return {
              code: 0,
              data: {
                items: [{ open_department_id: "d1", name: "One" }],
                has_more: true,
                page_token: "departments-page-2",
              },
            };
          return {
            code: 0,
            data: {
              items: [{ open_department_id: "d2", name: "Two" }],
              has_more: false,
            },
          };
        }
        if (path.includes("/departments/"))
          return { code: 0, data: { items: [], has_more: false } };
        const departmentId = params.department_id;
        return {
          code: 0,
          data: {
            items:
              departmentId === "d1"
                ? users.map((user) => ({ ...user, department_ids: ["d1"] }))
                : [],
            has_more: false,
          },
        };
      },
    ),
  };
}

function transactionMocks() {
  const tx = {
    department: {
      upsert: vi.fn(async ({ where }: { where: { externalId: string } }) => ({
        id: `internal-${where.externalId}`,
      })),
      update: vi.fn(async () => ({})),
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
    user: {
      update: vi.fn(
        async ({ where, data }: { where: { id: string }; data: object }) => ({
          id: where.id,
          ...data,
        }),
      ),
      upsert: vi.fn(async ({ create }: { create: { openId: string } }) => ({
        id: `new-${create.openId}`,
        ...create,
      })),
      findMany: vi.fn(async () => [
        { id: "legacy-alice", openId: "ou-alice" },
        { id: "legacy-unmatched", openId: "legacy:unmatched" },
        { id: "stale", openId: "ou-stale" },
      ]),
      updateMany: vi.fn(async () => ({ count: 1 })),
    },
    employeeProfile: { upsert: vi.fn(async () => ({})) },
    session: { updateMany: vi.fn(async () => ({ count: 1 })) },
    syncRun: { update: vi.fn(async () => ({})) },
  };
  return tx;
}

describe("runOrganizationSync", () => {
  it("paginates discovery and migrates a uniquely named legacy user in one transaction", async () => {
    const client = organizationClient();
    const tx = transactionMocks();
    const database = {
      user: {
        findMany: vi.fn(async () => [
          {
            id: "legacy-alice",
            openId: "legacy:alice",
            displayName: "Alice",
          },
        ]),
      },
      $transaction: vi.fn(
        async (task: (value: typeof tx) => Promise<unknown>) => task(tx),
      ),
    };

    await expect(
      runOrganizationSync("run-1", client as never, {
        database: database as never,
        lock: runWithLock as never,
      }),
    ).resolves.toEqual({
      discovered: 1,
      inserted: 0,
      updated: 1,
      softDeleted: 2,
    });

    expect(client.get).toHaveBeenCalledWith(
      expect.stringContaining("/departments/0/children"),
      expect.anything(),
      expect.objectContaining({ page_token: "departments-page-2" }),
    );
    expect(database.$transaction).toHaveBeenCalledOnce();
    expect(tx.user.update).toHaveBeenCalledWith({
      where: { id: "legacy-alice" },
      data: {
        openId: "ou-alice",
        displayName: "Alice",
        status: "ACTIVE",
      },
    });
    expect(tx.employeeProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "legacy-alice" },
        update: { departmentId: "internal-d1" },
      }),
    );
    expect(tx.department.updateMany).toHaveBeenCalledWith({
      where: { active: true, externalId: { notIn: ["d1", "d2"] } },
      data: { active: false },
    });
    expect(tx.user.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["legacy-unmatched", "stale"] } },
      data: { status: "DISABLED" },
    });
    expect(tx.session.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId: { in: ["legacy-unmatched", "stale"] },
          revokedAt: null,
        },
      }),
    );
    expect(tx.syncRun.update).toHaveBeenCalledOnce();
  });

  it("rejects an ambiguous legacy displayName before opening a transaction", async () => {
    const client = organizationClient();
    const database = {
      user: {
        findMany: vi.fn(async () => [
          { id: "legacy-1", openId: "legacy:1", displayName: "Alice" },
          { id: "legacy-2", openId: "legacy:2", displayName: "Alice" },
        ]),
      },
      $transaction: vi.fn(),
    };

    await expect(
      runOrganizationSync("run-2", client as never, {
        database: database as never,
        lock: runWithLock as never,
      }),
    ).rejects.toThrow("Ambiguous legacy user displayName");
    expect(database.$transaction).not.toHaveBeenCalled();
  });

  it("does not publish success when a transactional write rolls back", async () => {
    const client = organizationClient();
    const tx = transactionMocks();
    tx.employeeProfile.upsert.mockRejectedValueOnce(
      new Error("profile write failed"),
    );
    const committed = { value: false };
    const database = {
      user: {
        findMany: vi.fn(async () => [
          {
            id: "legacy-alice",
            openId: "legacy:alice",
            displayName: "Alice",
          },
        ]),
      },
      $transaction: vi.fn(
        async (task: (value: typeof tx) => Promise<unknown>) => {
          const result = await task(tx);
          committed.value = true;
          return result;
        },
      ),
    };

    await expect(
      runOrganizationSync("run-3", client as never, {
        database: database as never,
        lock: runWithLock as never,
      }),
    ).rejects.toThrow("profile write failed");
    expect(committed.value).toBe(false);
    expect(tx.syncRun.update).not.toHaveBeenCalled();
    expect(tx.session.updateMany).not.toHaveBeenCalled();
  });
});
