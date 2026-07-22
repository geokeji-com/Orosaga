import { databaseSchemaFromUrl } from "@orosaga/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");
const prisma = new PrismaClient({
  adapter: new PrismaPg(
    { connectionString: databaseUrl },
    { schema: databaseSchemaFromUrl(databaseUrl) },
  ),
});
async function seedOrganization() {
  const departments = new Map<number, string>();
  for (let index = 1; index <= 5; index += 1) {
    const row = await prisma.department.upsert({
      where: { externalId: `demo-department-${index}` },
      create: {
        externalId: `demo-department-${index}`,
        name: `示例部门 ${index}`,
      },
      update: { name: `示例部门 ${index}`, active: true },
    });
    departments.set(index, row.id);
  }

  for (let index = 1; index <= 30; index += 1) {
    const departmentIndex = ((index - 1) % departments.size) + 1;
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
        portalTitle: "示例岗位",
        bio: "仅用于本地开发和自动化测试的虚构资料。",
        consultTopics: ["示例主题"],
        tags: ["示例"],
      },
      update: {
        departmentId,
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
          "示例数据后台",
          "本地开发用的示例数据入口。",
          "https://example.com/orosaga/data",
          "database",
          true,
        ],
        [
          "示例知识库",
          "本地开发用的示例知识入口。",
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
          "示例任务台",
          "本地开发用的示例任务入口。",
          "https://example.com/orosaga/tasks",
          "workflow",
          true,
        ],
        [
          "示例运营台",
          "仅展示被禁用入口的交互状态。",
          "https://example.com/orosaga/disabled-operations",
          "clipboard",
          false,
        ],
      ],
    ],
    [
      "观察、分析与交付",
      [
        [
          "示例分析面板",
          "本地开发用的示例分析入口。",
          "https://example.com/orosaga/analytics",
          "chart",
          true,
        ],
        [
          "示例状态看板",
          "本地开发用的示例状态入口。",
          "https://example.com/orosaga/status",
          "radar",
          true,
        ],
        [
          "示例报告系统",
          "仅展示被禁用入口的交互状态。",
          "https://example.com/orosaga/disabled-reports",
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
  const legacyCounts = [
    11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 13, 14, 13, 15,
  ];
  for (const [position, legacyDescendantCount] of legacyCounts.entries()) {
    const displayCode = `CAMP-${String(position + 1).padStart(2, "0")}`;
    const token = `demo-camp-${String(position + 1).padStart(2, "0")}`;
    const node = await prisma.wikiNode.upsert({
      where: { externalNodeToken: token },
      create: {
        sourceId: source.id,
        externalNodeToken: token,
        title: `示例营地 ${position + 1}`,
        nodeType: "wiki",
        url: `https://example.com/orosaga/camps/${position + 1}`,
      },
      update: { deletedAt: null },
    });
    await prisma.camp.upsert({
      where: { displayCode },
      create: {
        sourceId: source.id,
        rootNodeId: node.id,
        displayCode,
        legacyDescendantCount,
        documentCount: 0,
        sortOrder: position,
      },
      update: {
        rootNodeId: node.id,
        legacyDescendantCount,
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
  for (let position = 0; position < 6; position += 1) {
    const stage = await prisma.workflowStage.create({
      data: {
        workflowId: workflow.id,
        title: `示例阶段 ${position + 1}`,
        description: "仅用于本地开发和自动化测试的结构化流程。",
        iconKey: "workflow",
        sortOrder: position,
      },
    });
    for (const [itemType, values] of [
      ["INPUT", [`阶段 ${position + 1} 的示例输入`]],
      ["ACTION", [`阶段 ${position + 1} 的示例动作`]],
      [
        "DONE",
        Array.from(
          { length: 3 },
          (_, index) => `阶段 ${position + 1} 的完成标准 ${index + 1}`,
        ),
      ],
      ["OUTPUT", [`阶段 ${position + 1} 的示例产物`]],
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
