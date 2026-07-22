import { databaseSchemaFromUrl } from "@orosaga/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { companyDefaultContent } from "../src/content/company-default.js";
import { workflowDefault } from "../src/portal/workflow-default.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");
const prisma = new PrismaClient({
  adapter: new PrismaPg(
    { connectionString: databaseUrl },
    { schema: databaseSchemaFromUrl(databaseUrl) },
  ),
});
async function seedOrganization() {
  const departmentFixtures = [
    { name: "总裁办", members: 2 },
    { name: "销售部", members: 4 },
    { name: "运营部", members: 13 },
    { name: "技术部", members: 8 },
    { name: "人力资源部", members: 3 },
  ] as const;
  const departments = new Map<number, string>();
  for (const [offset, fixture] of departmentFixtures.entries()) {
    const index = offset + 1;
    const row = await prisma.department.upsert({
      where: { externalId: `demo-department-${index}` },
      create: {
        externalId: `demo-department-${index}`,
        name: fixture.name,
      },
      update: { name: fixture.name, active: true },
    });
    departments.set(index, row.id);
  }

  let departmentIndex = 1;
  let departmentMember = 0;
  for (let index = 1; index <= 30; index += 1) {
    if (departmentMember >= departmentFixtures[departmentIndex - 1]!.members) {
      departmentIndex += 1;
      departmentMember = 0;
    }
    departmentMember += 1;
    const departmentId = departments.get(departmentIndex)!;
    const user = await prisma.user.upsert({
      where: { openId: `demo-user-${index}` },
      create: {
        openId: `demo-user-${index}`,
        displayName: `示例成员 ${String(index).padStart(2, "0")}`,
      },
      update: { status: "ACTIVE" },
    });
    await prisma.employeeProfile.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        departmentId,
        portalTitle: departmentMember === 1 ? "部门负责人" : "示例岗位",
        bio: "仅用于本地开发和自动化测试的虚构资料。",
        consultTopics: ["示例主题"],
        tags: ["示例"],
      },
      update: {
        departmentId,
        portalTitle: departmentMember === 1 ? "部门负责人" : "示例岗位",
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
        payload:
          item.pageType === "COMPANY"
            ? companyDefaultContent
            : { title: item.title, summary: item.summary, blocks: [] },
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
          "数据采集与项目列表。用于建立项目、查看采集任务，并确认基础数据已经到位。",
          "https://example.com/orosaga/data",
          "database",
          true,
        ],
        [
          "好文章好信源",
          "沉淀可参考的高质量文章与信源，帮助内容判断有可追溯的参考坐标。",
          "https://example.com/orosaga/knowledge",
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
          "在日常运营中辅助处理任务与素材，适合承接具体执行动作。",
          "https://example.com/orosaga/tasks",
          "workflow",
          true,
        ],
        [
          "YiShanOS 运营工作台",
          "运营提交入口。用于按标准流程推进任务，并保留过程记录。",
          "https://example.com/orosaga/disabled-operations",
          "clipboard",
          true,
        ],
      ],
    ],
    [
      "观察、分析与交付",
      [
        [
          "数据分析面板",
          "查看项目数据、趋势与关键变化，为复盘和下一轮策略提供依据。",
          "https://example.com/orosaga/analytics",
          "chart",
          true,
        ],
        [
          "SaaS 看板",
          "从客户运营视角查看服务状态与项目概况，便于持续跟进。",
          "https://example.com/orosaga/status",
          "radar",
          true,
        ],
        [
          "报告生成系统",
          "把阶段数据整理为标准化报告，减少重复排版并保持对外口径一致。",
          "https://example.com/orosaga/disabled-reports",
          "file",
          true,
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
        spaceId: "demo",
        rootNodeToken: "demo-root",
      },
    },
    create: {
      name: "本地示例营地",
      spaceId: "demo",
      rootNodeToken: "demo-root",
      enabled: false,
    },
    update: { enabled: false },
  });
  const campFixtures = [
    ["CAMP-07", 0],
    ["CAMP-15", 1],
    ["CAMP-05", 2],
    ["CAMP-11", 2],
    ["CAMP-04", 3],
    ["CAMP-02", 3],
    ["CAMP-12", 5],
    ["CAMP-08", 5],
    ["CAMP-13", 8],
    ["CAMP-01", 11],
    ["CAMP-09", 13],
    ["CAMP-06", 15],
    ["CAMP-03", 28],
    ["CAMP-10", 45],
    ["CAMP-14", 56],
    ["CAMP-16", 56],
  ] as const;
  for (const [
    position,
    [displayCode, documentCount],
  ] of campFixtures.entries()) {
    const legacyDescendantCount = documentCount;
    const token = `demo-camp-${String(position + 1).padStart(2, "0")}`;
    const node = await prisma.wikiNode.upsert({
      where: { externalNodeToken: token },
      create: {
        sourceId: source.id,
        externalNodeToken: token,
        title: `示例营地 ${String(position + 1).padStart(2, "0")}`,
        nodeType: "wiki",
        url: `https://example.com/orosaga/camps/${position + 1}`,
      },
      update: {
        title: `示例营地 ${String(position + 1).padStart(2, "0")}`,
        deletedAt: null,
      },
    });
    await prisma.camp.upsert({
      where: { displayCode },
      create: {
        sourceId: source.id,
        rootNodeId: node.id,
        displayCode,
        legacyDescendantCount,
        documentCount,
        sortOrder: position,
      },
      update: {
        rootNodeId: node.id,
        legacyDescendantCount,
        documentCount,
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
  const workflow = await prisma.workflowDefinition.upsert({
    where: { slug: "geo-operating" },
    create: { slug: "geo-operating", title: "运营工作流" },
    update: { title: "运营工作流" },
  });
  await prisma.workflowStage.deleteMany({ where: { workflowId: workflow.id } });
  for (const [position, fixture] of workflowDefault.stages.entries()) {
    const stage = await prisma.workflowStage.create({
      data: {
        workflowId: workflow.id,
        title: fixture.title,
        description: fixture.summary,
        iconKey: fixture.iconKey,
        sortOrder: position,
      },
    });
    for (const [itemType, values] of [
      ["INPUT", fixture.inputs],
      ["ACTION", fixture.actions],
      ["DONE", fixture.done],
      ["OUTPUT", fixture.outputs],
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
    const stages =
      workflow.slug === "geo-operating"
        ? workflowDefault.stages
        : workflow.stages.map((stage) => ({
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
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "The one-time production migration seed has been retired; this seed is for development and tests only.",
    );
  }
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
