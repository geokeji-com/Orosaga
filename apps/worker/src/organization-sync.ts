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

type DepartmentRow = z.infer<typeof departmentSchema>;
type UserRow = z.infer<typeof userSchema>;
type LegacyUser = { id: string; openId: string; displayName: string };

type OrganizationSyncDependencies = {
  database?: typeof prisma;
  lock?: typeof withAdvisoryLock;
};

function departmentExternalId(row: DepartmentRow) {
  return row.open_department_id ?? row.department_id;
}

function planLegacyMigrations(users: UserRow[], existingUsers: LegacyUser[]) {
  const legacyByName = new Map<string, LegacyUser[]>();
  const realByName = new Map<string, UserRow[]>();
  for (const row of existingUsers.filter((row) =>
    row.openId.startsWith("legacy:"),
  ))
    legacyByName.set(row.displayName, [
      ...(legacyByName.get(row.displayName) ?? []),
      row,
    ]);
  for (const row of users)
    realByName.set(row.name, [...(realByName.get(row.name) ?? []), row]);

  const migrations = new Map<string, LegacyUser>();
  for (const [name, legacyMatches] of legacyByName) {
    const realMatches = realByName.get(name) ?? [];
    if (!realMatches.length) continue;
    if (legacyMatches.length !== 1 || realMatches.length !== 1)
      throw new Error(
        `Ambiguous legacy user displayName ${JSON.stringify(name)}: ${legacyMatches.length} legacy and ${realMatches.length} Feishu users`,
      );
    const target = realMatches[0]!;
    const occupied = existingUsers.find(
      (row) => row.openId === target.open_id && row.id !== legacyMatches[0]!.id,
    );
    if (occupied)
      throw new Error(
        `Cannot migrate legacy user ${JSON.stringify(name)}: Feishu open_id is already assigned`,
      );
    migrations.set(target.open_id, legacyMatches[0]!);
  }
  return migrations;
}

async function allPages<T>(
  client: FeishuClient,
  path: string,
  schema: z.ZodType<T>,
  params: Record<string, string>,
) {
  const items: T[] = [];
  let token: string | undefined;
  const seenTokens = new Set<string>();
  do {
    const response = await client.get(path, page(schema), {
      ...params,
      page_size: 50,
      page_token: token,
    });
    items.push(...response.data.items);
    if (response.data.has_more && !response.data.page_token)
      throw new Error(`Feishu pagination for ${path} omitted page_token`);
    token = response.data.has_more ? response.data.page_token : undefined;
    if (token && seenTokens.has(token))
      throw new Error(`Feishu pagination for ${path} repeated page_token`);
    if (token) seenTokens.add(token);
  } while (token);
  return items;
}

export async function runOrganizationSync(
  runId: string,
  client = new FeishuClient(),
  dependencies: OrganizationSyncDependencies = {},
) {
  const database = dependencies.database ?? prisma;
  const lock = dependencies.lock ?? withAdvisoryLock;
  return lock("orosaga:organization-sync", async () => {
    const discoveredDepartments: DepartmentRow[] = [];
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
        const id = departmentExternalId(child);
        if (!id)
          throw new Error(
            `Feishu department ${JSON.stringify(child.name)} has no external id`,
          );
        if (visited.has(id)) continue;
        visited.add(id);
        discoveredDepartments.push(child);
        pending.push(id);
      }
    }
    const users = new Map<string, UserRow>();
    for (const department of discoveredDepartments) {
      const id = departmentExternalId(department)!;
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
      for (const user of rows) {
        const previous = users.get(user.open_id);
        if (previous && previous.name !== user.name)
          throw new Error(
            `Feishu user ${user.open_id} returned conflicting names`,
          );
        users.set(user.open_id, {
          ...user,
          department_ids: [
            ...new Set([
              ...(previous?.department_ids ?? []),
              ...user.department_ids,
            ]),
          ],
        });
      }
    }

    const userRows = [...users.values()];
    const existingUsers = await database.user.findMany({
      where: {
        OR: [
          { openId: { startsWith: "legacy:" } },
          { openId: { in: userRows.map((row) => row.open_id) } },
        ],
      },
      select: { id: true, openId: true, displayName: true },
    });
    const migrations = planLegacyMigrations(userRows, existingUsers);

    return database.$transaction(async (tx) => {
      const departmentIds = new Map<string, string>();
      for (const row of discoveredDepartments) {
        const externalId = departmentExternalId(row)!;
        const saved = await tx.department.upsert({
          where: { externalId },
          create: { externalId, name: row.name },
          update: { name: row.name, active: true },
        });
        departmentIds.set(externalId, saved.id);
      }
      for (const row of discoveredDepartments) {
        const externalId = departmentExternalId(row)!;
        await tx.department.update({
          where: { externalId },
          data: {
            parentId: departmentIds.get(row.parent_department_id ?? "") ?? null,
          },
        });
      }
      const discoveredDepartmentIds = discoveredDepartments.map((row) =>
        departmentExternalId(row)!,
      );
      await tx.department.updateMany({
        where: {
          active: true,
          ...(discoveredDepartmentIds.length
            ? { externalId: { notIn: discoveredDepartmentIds } }
            : {}),
        },
        data: { active: false },
      });
      let inserted = 0;
      let updated = 0;
      const knownOpenIds = new Set(
        existingUsers
          .filter((row) => !row.openId.startsWith("legacy:"))
          .map((row) => row.openId),
      );
      for (const row of userRows) {
        const legacy = migrations.get(row.open_id);
        const user = legacy
          ? await tx.user.update({
              where: { id: legacy.id },
              data: {
                openId: row.open_id,
                displayName: row.name,
                status: "ACTIVE",
              },
            })
          : await tx.user.upsert({
              where: { openId: row.open_id },
              create: { openId: row.open_id, displayName: row.name },
              update: { displayName: row.name, status: "ACTIVE" },
            });
        if (legacy || knownOpenIds.has(row.open_id)) updated += 1;
        else inserted += 1;
        const departmentId =
          row.department_ids
            .map((id) => departmentIds.get(id))
            .find((id): id is string => Boolean(id)) ?? null;
        await tx.employeeProfile.upsert({
          where: { userId: user.id },
          create: { userId: user.id, departmentId },
          update: { departmentId },
        });
      }
      const managedUsers = await tx.user.findMany({
        where: { status: "ACTIVE" },
        select: { id: true, openId: true },
      });
      const staleUserIds = managedUsers
        .filter(
          (user) => !user.openId.startsWith("seed:") && !users.has(user.openId),
        )
        .map((user) => user.id);
      const revokedAt = new Date();
      if (staleUserIds.length) {
        await tx.user.updateMany({
          where: { id: { in: staleUserIds } },
          data: { status: "DISABLED" },
        });
        await tx.session.updateMany({
          where: { userId: { in: staleUserIds }, revokedAt: null },
          data: { revokedAt },
        });
      }
      const result = {
        discovered: users.size,
        inserted,
        updated,
        softDeleted: staleUserIds.length,
      };
      await tx.syncRun.update({
        where: { id: runId },
        data: {
          status: "SUCCEEDED",
          ...result,
          finishedAt: new Date(),
        },
      });
      return result;
    });
  });
}
