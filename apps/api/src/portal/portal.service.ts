import { Injectable, NotFoundException } from "@nestjs/common";
import { organizationQuerySchema } from "@orosaga/contracts";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service.js";

const roleRank = { EMPLOYEE: 1, EDITOR: 2, ADMIN: 3 } as const;

@Injectable()
export class PortalService {
  private weatherCache?: { value: unknown; expiresAt: number };

  constructor(private prisma: PrismaService) {}

  async navigation() {
    const rows = await this.prisma.navigationItem.findMany({
      where: { enabled: true },
      orderBy: { sortOrder: "asc" },
    });
    return rows.map((item) => ({
      id: item.id,
      label: item.label,
      description: "",
      href: item.route,
      iconKey: item.iconKey,
      themeKey: "mint",
      position: item.sortOrder,
    }));
  }

  departments() {
    return this.prisma.department
      .findMany({ where: { active: true }, orderBy: { name: "asc" } })
      .then((rows) =>
        rows.map((row) => ({
          id: row.id,
          externalDepartmentId: row.externalId,
          name: row.name,
          parentId: row.parentId,
          active: row.active,
        })),
      );
  }

  async members(query: unknown) {
    const input = organizationQuerySchema.parse(query);
    const profileWhere: Prisma.EmployeeProfileWhereInput = { visible: true };
    if (input.department) profileWhere.departmentId = input.department;
    const userWhere: Prisma.UserWhereInput = {
      status: "ACTIVE",
      profile: { is: profileWhere },
    };
    if (input.q)
      userWhere.displayName = { contains: input.q, mode: "insensitive" };
    if (input.cursor) userWhere.id = { gt: input.cursor };
    const rows = await this.prisma.user.findMany({
      where: userWhere,
      include: { profile: { include: { department: true } } },
      orderBy: { id: "asc" },
      take: 21,
    });
    const hasMore = rows.length > 20;
    const page = hasMore ? rows.slice(0, 20) : rows;
    return {
      items: page.map((user) => this.employee(user)),
      nextCursor: hasMore ? (page.at(-1)?.id ?? null) : null,
    };
  }

  async member(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, status: "ACTIVE", profile: { is: { visible: true } } },
      include: { profile: { include: { department: true } } },
    });
    if (!user)
      throw new NotFoundException({
        code: "EMPLOYEE_NOT_FOUND",
        message: "员工不存在",
      });
    return this.employee(user);
  }

  async workflow(slug: string) {
    const workflow = await this.prisma.workflowDefinition.findUnique({
      where: { slug },
      include: {
        stages: {
          include: { items: { orderBy: { sortOrder: "asc" } } },
          orderBy: { sortOrder: "asc" },
        },
      },
    });
    if (!workflow)
      throw new NotFoundException({
        code: "WORKFLOW_NOT_FOUND",
        message: "工作流不存在",
      });
    return {
      id: workflow.id,
      slug: workflow.slug,
      title: workflow.title,
      version: workflow.version,
      stages: workflow.stages.map((stage) => ({
        id: stage.id,
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
      })),
    };
  }

  async systemLinks(role: keyof typeof roleRank) {
    const rows = await this.prisma.systemLink.findMany({
      where: { enabled: true },
      include: { group: true },
      orderBy: [{ group: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    });
    return rows
      .filter((row) => roleRank[role] >= roleRank[row.minimumRole])
      .map((row) => ({
        id: row.id,
        group: row.group.title,
        name: row.title,
        description: row.description,
        href: row.url,
        iconKey: row.iconKey,
        environment: row.environment.toUpperCase(),
        minimumRole: row.minimumRole,
        enabled: row.enabled,
        version: row.group.version,
      }));
  }

  async camps() {
    const rows = await this.prisma.camp.findMany({
      where: { enabled: true },
      include: { rootNode: true, source: true },
      orderBy: { sortOrder: "asc" },
    });
    return rows.map((row) => ({
      id: row.id,
      displayCode: row.displayCode,
      title: row.rootNode.title,
      href: row.rootNode.url,
      legacyDescendantCount: row.legacyDescendantCount,
      documentCount: row.documentCount,
      syncedAt: (
        row.source.lastSuccessAt ?? row.rootNode.discoveredAt
      ).toISOString(),
    }));
  }

  async search(q: string, role: keyof typeof roleRank, type?: string) {
    const needle = q.trim().slice(0, 100);
    if (!needle) return { items: [], nextCursor: null };
    const [users, pages, workflows, systems, nodes] = await Promise.all([
      this.prisma.user.findMany({
        where: {
          status: "ACTIVE",
          displayName: { contains: needle, mode: "insensitive" },
          profile: { is: { visible: true } },
        },
        take: 5,
      }),
      this.prisma.$queryRaw<
        Array<{ id: string; slug: string; title: string; summary: string }>
      >(Prisma.sql`
        SELECT cp.id, cp.slug,
               cr.payload->>'title' AS title,
               cr.payload->>'summary' AS summary
        FROM content_pages cp
        JOIN content_revisions cr ON cr.id = cp.current_revision_id
        WHERE cp.slug ILIKE ${`%${needle}%`}
           OR cr.payload->>'title' ILIKE ${`%${needle}%`}
           OR cr.payload->>'summary' ILIKE ${`%${needle}%`}
        LIMIT 5
      `),
      this.prisma.workflowDefinition.findMany({
        where: { title: { contains: needle, mode: "insensitive" } },
        take: 5,
      }),
      this.prisma.systemLink.findMany({
        where: {
          enabled: true,
          title: { contains: needle, mode: "insensitive" },
        },
        take: 5,
      }),
      this.prisma.wikiNode.findMany({
        where: {
          deletedAt: null,
          title: { contains: needle, mode: "insensitive" },
        },
        take: 10,
      }),
    ]);
    const items = [
      ...users.map((row) => ({
        id: row.id,
        type: "EMPLOYEE",
        title: row.displayName,
        description: "同事",
        href: `/organization?member=${row.id}`,
      })),
      ...pages.map((row) => ({
        id: row.id,
        type: "PAGE",
        title: row.title || row.slug,
        description: row.summary || "门户内容",
        href: `/${row.slug}`,
      })),
      ...workflows.map((row) => ({
        id: row.id,
        type: "WORKFLOW",
        title: row.title,
        description: "工作流",
        href: `/workflow/${row.slug}`,
      })),
      ...systems
        .filter((row) => roleRank[role] >= roleRank[row.minimumRole])
        .map((row) => ({
          id: row.id,
          type: "SYSTEM",
          title: row.title,
          description: row.description,
          href: row.url,
        })),
      ...nodes.map((row) => ({
        id: row.id,
        type: "WIKI_NODE",
        title: row.title,
        description: "飞书知识库",
        href: row.url,
      })),
    ];
    const filtered = type ? items.filter((item) => item.type === type) : items;
    return { items: filtered.slice(0, 20), nextCursor: null };
  }

  async weather() {
    if (this.weatherCache && this.weatherCache.expiresAt > Date.now())
      return this.weatherCache.value;
    const url = process.env.WEATHER_API_URL;
    if (!url) return { available: false };
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(5_000) });
      if (!response.ok) throw new Error(`weather status ${response.status}`);
      const value: unknown = await response.json();
      this.weatherCache = { value, expiresAt: Date.now() + 15 * 60 * 1000 };
      return value;
    } catch {
      return this.weatherCache?.value ?? { available: false };
    }
  }

  private employee(
    user: Prisma.UserGetPayload<{
      include: { profile: { include: { department: true } } };
    }>,
  ) {
    const profile = user.profile;
    return {
      id: user.id,
      displayName: user.displayName,
      role: user.role,
      title: profile?.portalTitle ?? "",
      departmentId: profile?.departmentId ?? null,
      departmentName: profile?.department?.name ?? null,
      active: user.status === "ACTIVE",
      avatarUrl: profile?.avatarAssetId
        ? `/api/v1/assets/${profile.avatarAssetId}`
        : null,
      bio: profile?.bio ?? "",
      learn: Array.isArray(profile?.consultTopics)
        ? profile.consultTopics.join("、")
        : "",
      tags: Array.isArray(profile?.tags)
        ? profile.tags.filter((tag): tag is string => typeof tag === "string")
        : [],
      profileVersion: profile?.version ?? 0,
    };
  }
}
