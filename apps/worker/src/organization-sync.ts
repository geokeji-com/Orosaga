import { z } from "zod";
import { prisma, withAdvisoryLock } from "./db.js";
import { FeishuClient } from "./feishu-client.js";

const departmentSchema = z.object({
  department_id: z.string().optional(),
  open_department_id: z.string().optional(),
  parent_department_id: z.string().optional(),
  name: z.string(),
});
const userSchema = z.object({
  open_id: z.string(),
  name: z.string(),
  department_ids: z.array(z.string()).default([]),
});
const page = <T extends z.ZodType>(item: T) =>
  z.object({
    code: z.number(),
    data: z.object({
      items: z.array(item).default([]),
      has_more: z.boolean().default(false),
      page_token: z.string().optional(),
    }),
  });

async function allPages<T>(
  client: FeishuClient,
  path: string,
  schema: z.ZodType<T>,
  params: Record<string, string>,
) {
  const items: T[] = [];
  let token: string | undefined;
  do {
    const response = await client.get(path, page(schema), {
      ...params,
      page_size: 50,
      page_token: token,
    });
    items.push(...response.data.items);
    token = response.data.has_more ? response.data.page_token : undefined;
  } while (token);
  return items;
}

export async function runOrganizationSync(
  runId: string,
  client = new FeishuClient(),
) {
  return withAdvisoryLock("orosaga:organization-sync", async () => {
    const discoveredDepartments: z.infer<typeof departmentSchema>[] = [];
    const pending = ["0"];
    const visited = new Set<string>();
    while (pending.length) {
      const parent = pending.shift()!;
      const children = await allPages(
        client,
        `/open-apis/contact/v3/departments/${parent}/children`,
        departmentSchema,
        { department_id_type: "open_department_id" },
      );
      for (const child of children) {
        const id = child.open_department_id ?? child.department_id;
        if (!id || visited.has(id)) continue;
        visited.add(id);
        discoveredDepartments.push(child);
        pending.push(id);
      }
    }
    const users = new Map<string, z.infer<typeof userSchema>>();
    for (const department of discoveredDepartments) {
      const id = department.open_department_id ?? department.department_id;
      if (!id) continue;
      const rows = await allPages(
        client,
        "/open-apis/contact/v3/users/find_by_department",
        userSchema,
        {
          department_id: id,
          department_id_type: "open_department_id",
          user_id_type: "open_id",
        },
      );
      for (const user of rows) users.set(user.open_id, user);
    }

    const departmentIds = new Map<string, string>();
    for (const row of discoveredDepartments) {
      const externalId = row.open_department_id ?? row.department_id!;
      const saved = await prisma.department.upsert({
        where: { externalId },
        create: { externalId, name: row.name },
        update: { name: row.name, active: true },
      });
      departmentIds.set(externalId, saved.id);
    }
    for (const row of discoveredDepartments) {
      const externalId = row.open_department_id ?? row.department_id!;
      await prisma.department.update({
        where: { externalId },
        data: {
          parentId: departmentIds.get(row.parent_department_id ?? "") ?? null,
        },
      });
    }
    let inserted = 0;
    let updated = 0;
    for (const row of users.values()) {
      const existing = await prisma.user.findUnique({
        where: { openId: row.open_id },
      });
      const user = await prisma.user.upsert({
        where: { openId: row.open_id },
        create: { openId: row.open_id, displayName: row.name },
        update: { displayName: row.name, status: "ACTIVE" },
      });
      if (existing) updated += 1;
      else inserted += 1;
      const departmentId =
        departmentIds.get(row.department_ids[0] ?? "") ?? null;
      await prisma.employeeProfile.upsert({
        where: { userId: user.id },
        create: { userId: user.id, departmentId },
        update: { departmentId },
      });
    }
    let softDeleted = 0;
    const managedUsers = await prisma.user.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, openId: true },
    });
    for (const user of managedUsers) {
      if (
        user.openId.startsWith("legacy:") ||
        user.openId.startsWith("seed:") ||
        users.has(user.openId)
      )
        continue;
      await prisma.$transaction([
        prisma.user.update({
          where: { id: user.id },
          data: { status: "DISABLED" },
        }),
        prisma.session.updateMany({
          where: { userId: user.id, revokedAt: null },
          data: { revokedAt: new Date() },
        }),
      ]);
      softDeleted += 1;
    }
    await prisma.syncRun.update({
      where: { id: runId },
      data: {
        status: "SUCCEEDED",
        discovered: users.size,
        inserted,
        updated,
        softDeleted,
        finishedAt: new Date(),
      },
    });
    return { discovered: users.size, inserted, updated, softDeleted };
  });
}
