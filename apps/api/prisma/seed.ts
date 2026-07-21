import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { basename, resolve } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { camps } from "../../../seed/legacy/camps.generated.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");
const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: databaseUrl }),
});
const seedRoot = resolve(process.cwd(), "../../seed");

const capture = (body: string, key: string) =>
  body.match(new RegExp(`${key}:\\s*'([^']*)'`))?.[1] ?? "";
const list = (body: string, key: string) => {
  const raw = body.match(new RegExp(`${key}:\\s*\\[([^\\]]*)\\]`))?.[1] ?? "";
  return [...raw.matchAll(/'([^']+)'/g)].map((match) => match[1]!);
};

async function seedOrganization() {
  const source = await readFile(
    resolve(seedRoot, "legacy/OrganizationPage.tsx"),
    "utf8",
  );
  const blocks = [...source.matchAll(/member\(\{([\s\S]*?)\}\)/g)].map(
    (match) => match[1]!,
  );
  const departments = new Map<string, string>();
  for (const body of blocks) {
    const department = capture(body, "department");
    if (!departments.has(department)) {
      const row = await prisma.department.upsert({
        where: { externalId: `legacy:${department}` },
        create: { externalId: `legacy:${department}`, name: department },
        update: { name: department, active: true },
      });
      departments.set(department, row.id);
    }
  }

  for (const body of blocks) {
    const legacyId = capture(body, "id");
    const name = capture(body, "name");
    const department = capture(body, "department");
    const photo = capture(body, "photo");
    const user = await prisma.user.upsert({
      where: { openId: `legacy:${legacyId}` },
      create: { openId: `legacy:${legacyId}`, displayName: name },
      update: { displayName: name },
    });
    let avatarAssetId: string | null = null;
    if (photo) {
      const filename = basename(photo);
      const path = resolve(seedRoot, "private/team", filename);
      const bytes = await readFile(path);
      const info = await stat(path);
      const asset = await prisma.asset.upsert({
        where: { objectKey: `team/${filename}` },
        create: {
          objectKey: `team/${filename}`,
          mimeType: "image/png",
          sha256: createHash("sha256").update(bytes).digest("hex"),
          size: info.size,
          ownerId: user.id,
        },
        update: {
          sha256: createHash("sha256").update(bytes).digest("hex"),
          size: info.size,
        },
      });
      avatarAssetId = asset.id;
    }
    await prisma.employeeProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        departmentId: departments.get(department) ?? null,
        portalTitle: capture(body, "role"),
        bio: capture(body, "bio"),
        consultTopics: [capture(body, "learn")],
        tags: list(body, "tags"),
        avatarAssetId,
      },
      update: {
        departmentId: departments.get(department) ?? null,
        portalTitle: capture(body, "role"),
        bio: capture(body, "bio"),
        consultTopics: [capture(body, "learn")],
        tags: list(body, "tags"),
        avatarAssetId,
      },
    });
  }
}

async function seedNavigation() {
  const items = [
    ["公司", "/company", "building"],
    ["组织", "/organization", "network"],
    ["营地", "/camps", "book"],
    ["工作流", "/workflow", "workflow"],
    ["系统", "/systems", "boxes"],
  ] as const;
  for (const [position, item] of items.entries()) {
    const [label, route, iconKey] = item;
    const existing = await prisma.navigationItem.findFirst({
      where: { route },
    });
    if (existing)
      await prisma.navigationItem.update({
        where: { id: existing.id },
        data: { label, iconKey, sortOrder: position, enabled: true },
      });
    else
      await prisma.navigationItem.create({
        data: { label, route, iconKey, sortOrder: position },
      });
  }
}

const pages = [
  {
    slug: "home",
    pageType: "HOME",
    title: "Orosaga 山海经",
    summary:
      "一张持续生长的公司知识地图。认识我们为何出发，也找到你接下来要走的路。",
  },
  {
    slug: "company",
    pageType: "COMPANY",
    title: "关于移山科技",
    summary: "公司方向、方法、里程碑与长期积累。",
  },
] as const;

async function seedPages(adminId: string) {
  for (const item of pages) {
    const page = await prisma.contentPage.upsert({
      where: { slug: item.slug },
      create: { slug: item.slug, pageType: item.pageType },
      update: { pageType: item.pageType },
    });
    if (page.version > 0) continue;
    const revision = await prisma.contentRevision.create({
      data: {
        pageId: page.id,
        version: 1,
        actorId: adminId,
        changeSummary: "从本地原型建立云端基线",
        payload: { title: item.title, summary: item.summary, blocks: [] },
      },
    });
    await prisma.contentPage.update({
      where: { id: page.id },
      data: { version: 1, currentRevisionId: revision.id },
    });
  }
}

async function seedSystemLinks() {
  const groups = [
    [
      "项目启动与数据沉淀",
      [
        [
          "GEO 系统后台",
          "数据采集与项目列表。",
          "https://wanhuchangan.com/geo-enterprise/list",
          "database",
          true,
        ],
        [
          "好文章好信源",
          "沉淀可参考的高质量文章与信源。",
          "https://good.wanhuchangan.cn/",
          "book",
          true,
        ],
      ],
    ],
    [
      "运营执行与协同",
      [
        [
          "Noah 辅助工作台",
          "日常运营任务与素材辅助。",
          "https://noah.wanhuchangan.com/desktop",
          "workflow",
          true,
        ],
        [
          "YiShanOS 运营工作台",
          "旧本机地址待替换为云端 HTTPS 域名。",
          "http://localhost:3302/prototype/submission",
          "clipboard",
          false,
        ],
      ],
    ],
    [
      "观察、分析与交付",
      [
        [
          "数据分析面板",
          "查看项目趋势与关键变化。",
          "https://dash.wanhuchangan.cn/",
          "chart",
          true,
        ],
        [
          "SaaS 看板",
          "从客户运营视角查看服务状态。",
          "https://status.geokeji.com/operator/clients",
          "radar",
          true,
        ],
        [
          "报告生成系统",
          "裸 IP 地址待补 HTTPS 域名。",
          "http://47.95.247.158:8765/",
          "file",
          false,
        ],
      ],
    ],
  ] as const;
  for (const [groupPosition, [title, links]] of groups.entries()) {
    let group = await prisma.systemLinkGroup.findFirst({ where: { title } });
    group ??= await prisma.systemLinkGroup.create({
      data: { title, sortOrder: groupPosition },
    });
    for (const [
      position,
      [name, description, url, iconKey, enabled],
    ] of links.entries()) {
      const existing = await prisma.systemLink.findFirst({
        where: { groupId: group.id, title: name },
      });
      const data = { description, url, iconKey, enabled, sortOrder: position };
      if (existing)
        await prisma.systemLink.update({ where: { id: existing.id }, data });
      else
        await prisma.systemLink.create({
          data: { groupId: group.id, title: name, ...data },
        });
    }
  }
}

async function seedCamps() {
  const source = await prisma.knowledgeSource.upsert({
    where: {
      spaceId_rootNodeToken: {
        spaceId: "legacy",
        rootNodeToken: "legacy-root",
      },
    },
    create: {
      name: "旧版个人分享营地",
      spaceId: "legacy",
      rootNodeToken: "legacy-root",
      enabled: false,
    },
    update: { enabled: false },
  });
  for (const [position, item] of camps.entries()) {
    const node = await prisma.wikiNode.upsert({
      where: { externalNodeToken: item.nodeToken },
      create: {
        sourceId: source.id,
        externalNodeToken: item.nodeToken,
        title: item.title,
        nodeType: "wiki",
        url: item.href,
      },
      update: { title: item.title, url: item.href, deletedAt: null },
    });
    await prisma.camp.upsert({
      where: { displayCode: item.id },
      create: {
        sourceId: source.id,
        rootNodeId: node.id,
        displayCode: item.id,
        legacyDescendantCount: item.documentCount,
        documentCount: 0,
        sortOrder: position,
      },
      update: {
        rootNodeId: node.id,
        legacyDescendantCount: item.documentCount,
        sortOrder: position,
        enabled: true,
      },
    });
  }
  await prisma.knowledgeSource.update({
    where: { id: source.id },
    data: { lastSuccessAt: new Date() },
  });
}

async function seedWorkflow() {
  const source = await readFile(
    resolve(seedRoot, "legacy/WorkflowPage.tsx"),
    "utf8",
  );
  const arrayBody =
    source.match(/const workflowStages[\s\S]*?= \[([\s\S]*?)\n\]\n/)?.[1] ?? "";
  const stages = [...arrayBody.matchAll(/\n {2}\{([\s\S]*?)\n {2}\},/g)].map(
    (match) => match[1]!,
  );
  const workflow = await prisma.workflowDefinition.upsert({
    where: { slug: "geo-operating" },
    create: { slug: "geo-operating", title: "运营工作流" },
    update: { title: "运营工作流" },
  });
  await prisma.workflowStage.deleteMany({ where: { workflowId: workflow.id } });
  for (const [position, body] of stages.entries()) {
    const stage = await prisma.workflowStage.create({
      data: {
        workflowId: workflow.id,
        title: capture(body, "title"),
        description: capture(body, "summary"),
        iconKey: "workflow",
        sortOrder: position,
      },
    });
    for (const [itemType, values] of [
      ["INPUT", list(body, "inputs")],
      ["ACTION", list(body, "actions")],
      ["DONE", list(body, "done")],
      ["OUTPUT", list(body, "outputs")],
    ] as const) {
      await prisma.workflowItem.createMany({
        data: values.map((content, sortOrder) => ({
          stageId: stage.id,
          itemType,
          content,
          sortOrder,
        })),
      });
    }
  }
}

async function seedInventoryAsset() {
  const filename = "智能纪要.png";
  const path = resolve(seedRoot, "private/team", filename);
  const bytes = await readFile(path);
  await prisma.asset.upsert({
    where: { objectKey: `team/${filename}` },
    create: {
      objectKey: `team/${filename}`,
      mimeType: "image/png",
      sha256: createHash("sha256").update(bytes).digest("hex"),
      size: bytes.length,
    },
    update: {
      sha256: createHash("sha256").update(bytes).digest("hex"),
      size: bytes.length,
    },
  });
}

async function seedResourceBaselines(actorId: string) {
  const links = await prisma.systemLink.findMany({ include: { group: true } });
  for (const link of links) {
    const exists = await prisma.resourceRevision.count({
      where: { resourceType: "system-link", resourceId: link.id },
    });
    if (!exists)
      await prisma.resourceRevision.create({
        data: {
          resourceType: "system-link",
          resourceId: link.id,
          version: 1,
          actorId,
          changeSummary: "从本地原型建立基线",
          payload: {
            expectedVersion: 1,
            group: link.group.title,
            name: link.title,
            description: link.description,
            href: link.url,
            iconKey: link.iconKey,
            environment: link.environment.toUpperCase(),
            minimumRole: link.minimumRole,
            enabled: link.enabled,
          },
        },
      });
  }
  const workflows = await prisma.workflowDefinition.findMany({
    include: {
      stages: { include: { items: true }, orderBy: { sortOrder: "asc" } },
    },
  });
  for (const workflow of workflows) {
    const exists = await prisma.resourceRevision.count({
      where: { resourceType: "workflow", resourceId: workflow.id },
    });
    if (exists) continue;
    const stages = workflow.stages.map((stage) => ({
      key: `stage-${stage.sortOrder}`,
      title: stage.title,
      shortTitle: stage.title,
      summary: stage.description,
      owner: "",
      system: "",
      iconKey: stage.iconKey,
      inputs: stage.items
        .filter((item) => item.itemType === "INPUT")
        .map((item) => item.content),
      actions: stage.items
        .filter((item) => item.itemType === "ACTION")
        .map((item) => item.content),
      done: stage.items
        .filter((item) => item.itemType === "DONE")
        .map((item) => item.content),
      outputs: stage.items
        .filter((item) => item.itemType === "OUTPUT")
        .map((item) => item.content),
      next: "",
      position: stage.sortOrder,
    }));
    await prisma.resourceRevision.create({
      data: {
        resourceType: "workflow",
        resourceId: workflow.id,
        version: 1,
        actorId,
        changeSummary: "从本地原型建立基线",
        payload: { expectedVersion: 1, title: workflow.title, stages },
      },
    });
  }
}

async function main() {
  const admin = await prisma.user.upsert({
    where: { openId: "seed:content-migration" },
    create: {
      openId: "seed:content-migration",
      displayName: "内容迁移任务",
      role: "ADMIN",
      status: "DISABLED",
    },
    update: { role: "ADMIN", status: "DISABLED" },
  });
  await seedOrganization();
  await seedNavigation();
  await seedPages(admin.id);
  await seedSystemLinks();
  await seedCamps();
  await seedWorkflow();
  await seedInventoryAsset();
  await seedResourceBaselines(admin.id);
  const [employees, assets, campCount, links, stages] = await Promise.all([
    prisma.employeeProfile.count(),
    prisma.asset.count(),
    prisma.camp.count(),
    prisma.systemLink.count(),
    prisma.workflowStage.count(),
  ]);
  console.log({
    employees,
    assets,
    camps: campCount,
    systemLinks: links,
    workflowStages: stages,
  });
}

main().finally(() => prisma.$disconnect());
