import { z } from "zod";
import { runOperation } from "./prisma.js";

const tokenResponse = z.object({
  code: z.number(),
  msg: z.string().optional(),
  tenant_access_token: z.string().optional(),
});
const nodeResponse = z.object({
  code: z.number(),
  msg: z.string().optional(),
  data: z
    .object({
      node: z.object({ space_id: z.string(), node_token: z.string() }),
    })
    .optional(),
});
const childrenResponse = z.object({
  code: z.number(),
  msg: z.string().optional(),
  data: z.object({
    items: z
      .array(z.object({ node_token: z.string(), title: z.string() }))
      .default([]),
    has_more: z.boolean().default(false),
    page_token: z.string().optional(),
  }),
});

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

async function requestJson(url: URL, token?: string) {
  const response = await fetch(url, {
    ...(token ? { headers: { authorization: `Bearer ${token}` } } : {}),
    signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok)
    throw new Error(`Feishu preflight failed with HTTP ${response.status}`);
  return response.json();
}

async function tenantToken(base: string) {
  const response = await fetch(
    `${base}/open-apis/auth/v3/tenant_access_token/internal`,
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        app_id: required("FEISHU_APP_ID"),
        app_secret: required("FEISHU_APP_SECRET"),
      }),
      signal: AbortSignal.timeout(12_000),
    },
  );
  const body = tokenResponse.parse(await response.json());
  if (!response.ok || body.code !== 0 || !body.tenant_access_token)
    throw new Error(
      `Feishu tenant token rejected: ${body.msg ?? response.status}`,
    );
  return body.tenant_access_token;
}

void runOperation(async (prisma) => {
  const base = process.env.FEISHU_API_BASE_URL ?? "https://open.feishu.cn";
  const rootToken = required("FEISHU_WIKI_ROOT_NODE_TOKEN");
  const excludedTitles = (process.env.FEISHU_WIKI_EXCLUDED_TITLES ?? "")
    .split(",")
    .map((title) => title.trim())
    .filter(Boolean);
  const token = await tenantToken(base);
  const nodeUrl = new URL("/open-apis/wiki/v2/spaces/get_node", base);
  nodeUrl.searchParams.set("token", rootToken);
  const root = nodeResponse.parse(await requestJson(nodeUrl, token));
  if (root.code !== 0 || !root.data)
    throw new Error(
      `Feishu Wiki root is unavailable: ${root.msg ?? root.code}`,
    );
  const spaceId = root.data.node.space_id;

  const excludedTokens: string[] = [];
  let pageToken: string | undefined;
  do {
    const childrenUrl = new URL(
      `/open-apis/wiki/v2/spaces/${spaceId}/nodes`,
      base,
    );
    childrenUrl.searchParams.set("parent_node_token", rootToken);
    childrenUrl.searchParams.set("page_size", "50");
    if (pageToken) childrenUrl.searchParams.set("page_token", pageToken);
    const page = childrenResponse.parse(await requestJson(childrenUrl, token));
    if (page.code !== 0)
      throw new Error(
        `Feishu Wiki children unavailable: ${page.msg ?? page.code}`,
      );
    for (const item of page.data.items)
      if (excludedTitles.includes(item.title))
        excludedTokens.push(item.node_token);
    pageToken = page.data.has_more ? page.data.page_token : undefined;
  } while (pageToken);
  if (excludedTokens.length !== excludedTitles.length)
    throw new Error(
      "Not every configured Wiki exclusion title resolved to exactly one direct child",
    );

  const source = await prisma.knowledgeSource.upsert({
    where: { spaceId_rootNodeToken: { spaceId, rootNodeToken: rootToken } },
    create: {
      name: process.env.FEISHU_WIKI_SOURCE_NAME ?? "飞书个人分享营地",
      spaceId,
      rootNodeToken: rootToken,
      excludedTokens,
      intervalMins: Number(process.env.SYNC_INTERVAL_MINUTES ?? 30),
      enabled: true,
    },
    update: { excludedTokens, enabled: true, version: { increment: 1 } },
  });
  console.log(
    JSON.stringify({
      operation: "configure-feishu-source",
      sourceId: source.id,
      excluded: excludedTokens.length,
    }),
  );
}).catch((error: unknown) => {
  console.error(
    JSON.stringify({
      operation: "configure-feishu-source",
      ok: false,
      error: error instanceof Error ? error.message : "unknown error",
    }),
  );
  process.exitCode = 1;
});
