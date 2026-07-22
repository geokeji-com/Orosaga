import { z } from "zod";
import { Prisma, type KnowledgeSource } from "@prisma/client";
import { prisma, withAdvisoryLock } from "./db.js";
import { FeishuClient } from "./feishu-client.js";
import { countWikiDescendants } from "./wiki-metrics.js";

const nodeSchema = z.object({
  node_token: z.string(),
  parent_node_token: z.string().optional(),
  title: z.string(),
  obj_type: z.string(),
  has_child: z.boolean().default(false),
  creator: z.string().optional(),
});
const pageSchema = z.object({
  code: z.number(),
  data: z.object({
    items: z.array(nodeSchema).default([]),
    has_more: z.boolean().default(false),
    page_token: z.string().optional(),
  }),
});
type WikiNode = z.infer<typeof nodeSchema>;
type WikiSyncDependencies = {
  database?: typeof prisma;
  lock?: typeof withAdvisoryLock;
};

async function children(
  client: FeishuClient,
  spaceId: string,
  parentToken: string,
) {
  const items: WikiNode[] = [];
  let pageToken: string | undefined;
  const seenTokens = new Set<string>();
  do {
    const response = await client.get(
      `/open-apis/wiki/v2/spaces/${spaceId}/nodes`,
      pageSchema,
      { parent_node_token: parentToken, page_size: 50, page_token: pageToken },
    );
    items.push(...response.data.items);
    if (response.data.has_more && !response.data.page_token)
      throw new Error(
        `Feishu Wiki pagination for ${parentToken} omitted page_token`,
      );
    pageToken = response.data.has_more ? response.data.page_token : undefined;
    if (pageToken && seenTokens.has(pageToken))
      throw new Error(
        `Feishu Wiki pagination for ${parentToken} repeated page_token`,
      );
    if (pageToken) seenTokens.add(pageToken);
  } while (pageToken);
  return items;
}

async function snapshot(
  client: FeishuClient,
  spaceId: string,
  rootToken: string,
  excluded: Set<string>,
) {
  const nodes: WikiNode[] = [];
  const pending = [rootToken];
  const visited = new Set<string>();
  while (pending.length) {
    const parent = pending.shift()!;
    if (visited.has(parent)) continue;
    visited.add(parent);
    const rows = await children(client, spaceId, parent);
    for (const row of rows) {
      if (excluded.has(row.node_token)) continue;
      nodes.push(row);
      if (row.has_child) pending.push(row.node_token);
    }
  }
  return nodes;
}

export async function runWikiSync(
  runId: string,
  client = new FeishuClient(),
  dependencies: WikiSyncDependencies = {},
) {
  const database = dependencies.database ?? prisma;
  const lock = dependencies.lock ?? withAdvisoryLock;
  return lock("orosaga:wiki-sync", async () => {
    const sources = await database.knowledgeSource.findMany({
      where: { enabled: true },
    });
    const snapshots: Array<{
      source: KnowledgeSource;
      excluded: Set<string>;
      nodes: WikiNode[];
    }> = [];
    for (const source of sources) {
      const excluded = new Set(
        Array.isArray(source.excludedTokens)
          ? source.excludedTokens.filter(
              (item): item is string => typeof item === "string",
            )
          : [],
      );
      const nodes = await snapshot(
        client,
        source.spaceId,
        source.rootNodeToken,
        excluded,
      );
      snapshots.push({ source, excluded, nodes });
    }

    const total = {
      discovered: 0,
      inserted: 0,
      updated: 0,
      softDeleted: 0,
      skipped: 0,
    };
    const wikiHost = process.env.FEISHU_WIKI_HOST ?? "wanhuxian.feishu.cn";
    return database.$transaction(
      async (tx) => {
        for (const { source, excluded, nodes } of snapshots) {
          const tokens = nodes.map((node) => node.node_token);
          const old = await tx.wikiNode.findMany({
            where: { sourceId: source.id },
            select: { externalNodeToken: true },
          });
          const existing = tokens.length
            ? await tx.wikiNode.findMany({
                where: { externalNodeToken: { in: tokens } },
                select: { externalNodeToken: true },
              })
            : [];
          const known = new Set(existing.map((item) => item.externalNodeToken));
          for (const node of nodes) {
            await tx.wikiNode.upsert({
              where: { externalNodeToken: node.node_token },
              create: {
                sourceId: source.id,
                externalNodeToken: node.node_token,
                parentNodeToken: node.parent_node_token ?? null,
                title: node.title,
                nodeType: node.obj_type,
                url: `https://${wikiHost}/wiki/${node.node_token}`,
                authorMetadata: node.creator
                  ? { creator: node.creator }
                  : Prisma.JsonNull,
              },
              update: {
                sourceId: source.id,
                parentNodeToken: node.parent_node_token ?? null,
                title: node.title,
                nodeType: node.obj_type,
                url: `https://${wikiHost}/wiki/${node.node_token}`,
                authorMetadata: node.creator
                  ? { creator: node.creator }
                  : Prisma.JsonNull,
                discoveredAt: new Date(),
                deletedAt: null,
              },
            });
            if (known.has(node.node_token)) total.updated += 1;
            else total.inserted += 1;
          }
          const missing = old
            .filter((item) => !tokens.includes(item.externalNodeToken))
            .map((item) => item.externalNodeToken);
          if (missing.length)
            await tx.wikiNode.updateMany({
              where: {
                sourceId: source.id,
                externalNodeToken: { in: missing },
              },
              data: { deletedAt: new Date() },
            });
          total.softDeleted += missing.length;
          const directRoots = nodes.filter(
            (node) => node.parent_node_token === source.rootNodeToken,
          );
          const existingCodes = await tx.camp.findMany({
            select: { displayCode: true },
          });
          let nextCode =
            Math.max(
              0,
              ...existingCodes.map((row) =>
                Number(row.displayCode.match(/\d+/)?.[0] ?? 0),
              ),
            ) + 1;
          const activeRootIds: string[] = [];
          for (const [position, root] of directRoots.entries()) {
            const wikiNode = await tx.wikiNode.findUniqueOrThrow({
              where: { externalNodeToken: root.node_token },
            });
            activeRootIds.push(wikiNode.id);
            const existingCamp = await tx.camp.findUnique({
              where: { rootNodeId: wikiNode.id },
            });
            const metrics = countWikiDescendants(root.node_token, nodes);
            if (existingCamp)
              await tx.camp.update({
                where: { id: existingCamp.id },
                data: {
                  sourceId: source.id,
                  sortOrder: position,
                  ...metrics,
                  enabled: true,
                },
              });
            else {
              const displayCode = `CAMP-${String(nextCode).padStart(2, "0")}`;
              nextCode += 1;
              await tx.camp.create({
                data: {
                  sourceId: source.id,
                  rootNodeId: wikiNode.id,
                  displayCode,
                  sortOrder: position,
                  ...metrics,
                },
              });
            }
          }
          await tx.camp.updateMany({
            where: {
              sourceId: source.id,
              enabled: true,
              ...(activeRootIds.length
                ? { rootNodeId: { notIn: activeRootIds } }
                : {}),
            },
            data: { enabled: false },
          });
          await tx.knowledgeSource.update({
            where: { id: source.id },
            data: { lastSuccessAt: new Date() },
          });
          total.discovered += nodes.length;
          total.skipped += excluded.size;
        }
        await tx.syncRun.update({
          where: { id: runId },
          data: { status: "SUCCEEDED", ...total, finishedAt: new Date() },
        });
        return total;
      },
      { timeout: 60_000 },
    );
  });
}
