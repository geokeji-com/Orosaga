import { describe, expect, it, vi } from "vitest";

vi.mock("./db.js", () => ({ prisma: {}, withAdvisoryLock: vi.fn() }));

import { runWikiSync } from "./wiki-sync.js";

const runWithLock = async <T>(_name: string, task: () => Promise<T>) => task();

const source = {
  id: "source-live",
  name: "Live",
  spaceId: "space-1",
  rootNodeToken: "root",
  excludedTokens: [],
  intervalMins: 30,
  enabled: true,
  version: 1,
  lastSuccessAt: null,
};

function wikiClient() {
  return {
    get: vi.fn(
      async (
        _path: string,
        _schema: unknown,
        params: Record<string, string>,
      ) => {
        if (params.parent_node_token === "root") {
          if (!params.page_token)
            return {
              code: 0,
              data: {
                items: [
                  {
                    node_token: "camp-node",
                    parent_node_token: "root",
                    title: "Camp",
                    obj_type: "wiki",
                    has_child: true,
                  },
                ],
                has_more: true,
                page_token: "root-page-2",
              },
            };
          return {
            code: 0,
            data: {
              items: [
                {
                  node_token: "other-root",
                  parent_node_token: "root",
                  title: "Other",
                  obj_type: "wiki",
                  has_child: false,
                },
              ],
              has_more: false,
            },
          };
        }
        return {
          code: 0,
          data: {
            items: [
              {
                node_token: "child-doc",
                parent_node_token: "camp-node",
                title: "Document",
                obj_type: "docx",
                has_child: false,
              },
            ],
            has_more: false,
          },
        };
      },
    ),
  };
}

function wikiTransaction() {
  const tx = {
    wikiNode: {
      findMany: vi.fn(async ({ where }: { where: Record<string, unknown> }) =>
        "sourceId" in where
          ? [{ externalNodeToken: "gone" }]
          : [{ externalNodeToken: "camp-node" }],
      ),
      upsert: vi.fn(
        async ({ where }: { where: { externalNodeToken: string } }) => ({
          id:
            where.externalNodeToken === "camp-node"
              ? "stable-node-id"
              : `node-${where.externalNodeToken}`,
        }),
      ),
      updateMany: vi.fn(async () => ({ count: 1 })),
      findUniqueOrThrow: vi.fn(
        async ({ where }: { where: { externalNodeToken: string } }) => ({
          id:
            where.externalNodeToken === "camp-node"
              ? "stable-node-id"
              : `node-${where.externalNodeToken}`,
        }),
      ),
    },
    camp: {
      findMany: vi.fn(async () => [{ displayCode: "CAMP-07" }]),
      findUnique: vi.fn(async ({ where }: { where: { rootNodeId: string } }) =>
        where.rootNodeId === "stable-node-id"
          ? { id: "stable-camp-id", displayCode: "CAMP-07" }
          : null,
      ),
      update: vi.fn(async () => ({})),
      create: vi.fn(async () => ({})),
      updateMany: vi.fn(async () => ({ count: 0 })),
    },
    knowledgeSource: { update: vi.fn(async () => ({})) },
    syncRun: { update: vi.fn(async () => ({})) },
  };
  return tx;
}

describe("runWikiSync", () => {
  it("paginates and migrates legacy node/camp sources without changing stable ids", async () => {
    const client = wikiClient();
    const tx = wikiTransaction();
    const database = {
      knowledgeSource: { findMany: vi.fn(async () => [source]) },
      $transaction: vi.fn(
        async (task: (value: typeof tx) => Promise<unknown>) => task(tx),
      ),
    };

    await expect(
      runWikiSync("run-wiki", client as never, {
        database: database as never,
        lock: runWithLock as never,
      }),
    ).resolves.toEqual({
      discovered: 3,
      inserted: 2,
      updated: 1,
      softDeleted: 1,
      skipped: 0,
    });

    expect(client.get).toHaveBeenCalledWith(
      expect.stringContaining("/wiki/v2/spaces/space-1/nodes"),
      expect.anything(),
      expect.objectContaining({ page_token: "root-page-2" }),
    );
    expect(database.$transaction).toHaveBeenCalledOnce();
    expect(tx.wikiNode.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { externalNodeToken: "camp-node" },
        update: expect.objectContaining({ sourceId: "source-live" }),
      }),
    );
    expect(tx.camp.update).toHaveBeenCalledWith({
      where: { id: "stable-camp-id" },
      data: expect.objectContaining({
        sourceId: "source-live",
        enabled: true,
      }),
    });
    const campUpdate = tx.camp.update.mock.calls[0]![0];
    expect(campUpdate.data).not.toHaveProperty("displayCode");
    expect(campUpdate.data).not.toHaveProperty("id");
    expect(campUpdate.data).not.toHaveProperty("legacyDescendantCount");
    expect(campUpdate.data).toHaveProperty("documentCount", 1);
    expect(tx.camp.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        legacyDescendantCount: 0,
        documentCount: 0,
      }),
    });
    expect(tx.wikiNode.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          sourceId: "source-live",
          externalNodeToken: { in: ["gone"] },
        }),
      }),
    );
    expect(tx.syncRun.update).toHaveBeenCalledOnce();
  });

  it("fetches every enabled source before opening the snapshot transaction", async () => {
    const first = wikiClient();
    const client = {
      get: vi.fn(
        (path: string, schema: unknown, params: Record<string, string>) => {
          if (path.includes("space-2"))
            return Promise.reject(new Error("second source failed"));
          return first.get(path, schema, params);
        },
      ),
    };
    const database = {
      knowledgeSource: {
        findMany: vi.fn(async () => [
          source,
          { ...source, id: "source-2", spaceId: "space-2" },
        ]),
      },
      $transaction: vi.fn(),
    };

    await expect(
      runWikiSync("run-wiki-fail", client as never, {
        database: database as never,
        lock: runWithLock as never,
      }),
    ).rejects.toThrow("second source failed");
    expect(database.$transaction).not.toHaveBeenCalled();
  });

  it("explicitly disables all live-source camps for a valid empty snapshot", async () => {
    const client = {
      get: vi.fn(async () => ({
        code: 0,
        data: { items: [], has_more: false },
      })),
    };
    const tx = wikiTransaction();
    tx.wikiNode.findMany.mockResolvedValue([]);
    const database = {
      knowledgeSource: { findMany: vi.fn(async () => [source]) },
      $transaction: vi.fn(
        async (task: (value: typeof tx) => Promise<unknown>) => task(tx),
      ),
    };

    await runWikiSync("run-empty", client as never, {
      database: database as never,
      lock: runWithLock as never,
    });

    expect(tx.camp.updateMany).toHaveBeenCalledWith({
      where: { sourceId: "source-live", enabled: true },
      data: { enabled: false },
    });
  });
});
