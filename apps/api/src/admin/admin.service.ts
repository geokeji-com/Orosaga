import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, Role } from "@prisma/client";
import {
  createKnowledgeSourceSchema,
  saveKnowledgeSourceSchema,
  saveSystemLinkSchema,
  saveWorkflowSchema,
  updateEmployeeProfileSchema,
  updateRoleSchema,
} from "@orosaga/contracts";
import { PrismaService } from "../prisma/prisma.service.js";
import { isAllowedSystemUrl } from "../common/url-policy.js";

@Injectable()
export class AdminService {
  constructor(private prisma: PrismaService) {}

  async updateProfile(
    id: string,
    input: unknown,
    actorId: string,
    ip?: string,
  ) {
    const data = updateEmployeeProfileSchema.parse(input);
    return this.prisma.$transaction(async (tx) => {
      const profile = await tx.employeeProfile.findUnique({
        where: { userId: id },
      });
      if (!profile)
        throw new NotFoundException({
          code: "PROFILE_NOT_FOUND",
          message: "员工资料不存在",
        });
      if (profile.version !== data.expectedVersion)
        throw new ConflictException({
          code: "VERSION_CONFLICT",
          message: "员工资料已更新",
        });
      const updated = await tx.employeeProfile.update({
        where: { id: profile.id },
        data: {
          bio: data.bio,
          consultTopics: [data.learn],
          tags: data.tags,
          version: { increment: 1 },
        },
      });
      await tx.auditLog.create({
        data: {
          actorId,
          action: "employee.profile.publish",
          resourceType: "employee",
          resourceId: id,
          ipAddress: ip ?? null,
          metadata: { version: updated.version },
        },
      });
      return { id, version: updated.version };
    });
  }

  async updateRole(id: string, input: unknown, actorId: string, ip?: string) {
    const data = updateRoleSchema.parse(input);
    const previous = await this.prisma.user.findUnique({ where: { id } });
    if (!previous)
      throw new NotFoundException({
        code: "USER_NOT_FOUND",
        message: "用户不存在",
      });
    const updated = await this.prisma.user.update({
      where: { id },
      data: { role: data.role as Role },
    });
    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: "user.role.update",
        resourceType: "user",
        resourceId: id,
        ipAddress: ip ?? null,
        metadata: { from: previous.role, to: updated.role },
      },
    });
    return { id, role: updated.role };
  }

  async updateSystemLink(
    id: string,
    input: unknown,
    actorId: string,
    ip?: string,
  ) {
    const data = saveSystemLinkSchema.parse(input);
    this.assertSafeUrl(data.href);
    return this.prisma.$transaction(async (tx) => {
      const link = await tx.systemLink.findUnique({
        where: { id },
        include: { group: true },
      });
      if (!link)
        throw new NotFoundException({
          code: "SYSTEM_LINK_NOT_FOUND",
          message: "系统入口不存在",
        });
      if (link.group.version !== data.expectedVersion)
        throw new ConflictException({
          code: "VERSION_CONFLICT",
          message: "系统入口已更新",
        });
      const payload = { ...data, id };
      await tx.resourceRevision.create({
        data: {
          resourceType: "system-link",
          resourceId: id,
          version: link.group.version + 1,
          payload: payload as Prisma.InputJsonValue,
          actorId,
          changeSummary: "更新系统入口",
        },
      });
      await tx.systemLink.update({
        where: { id },
        data: {
          title: data.name,
          description: data.description,
          url: data.href,
          iconKey: data.iconKey,
          environment: data.environment.toLowerCase(),
          minimumRole: data.minimumRole as Role,
          enabled: data.enabled,
          group: { update: { title: data.group, version: { increment: 1 } } },
        },
      });
      await tx.auditLog.create({
        data: {
          actorId,
          action: "system-link.publish",
          resourceType: "system-link",
          resourceId: id,
          ipAddress: ip ?? null,
        },
      });
      return { id, version: link.group.version + 1 };
    });
  }

  async updateWorkflow(
    id: string,
    input: unknown,
    actorId: string,
    ip?: string,
  ) {
    const data = saveWorkflowSchema.parse(input);
    return this.prisma.$transaction(async (tx) => {
      const workflow = await tx.workflowDefinition.findUnique({
        where: { id },
      });
      if (!workflow)
        throw new NotFoundException({
          code: "WORKFLOW_NOT_FOUND",
          message: "工作流不存在",
        });
      if (workflow.version !== data.expectedVersion)
        throw new ConflictException({
          code: "VERSION_CONFLICT",
          message: "工作流已更新",
        });
      const nextVersion = workflow.version + 1;
      await tx.resourceRevision.create({
        data: {
          resourceType: "workflow",
          resourceId: id,
          version: nextVersion,
          payload: data as Prisma.InputJsonValue,
          actorId,
          changeSummary: "更新工作流",
        },
      });
      await tx.workflowStage.deleteMany({ where: { workflowId: id } });
      await tx.workflowDefinition.update({
        where: { id },
        data: { title: data.title, version: nextVersion },
      });
      for (const [position, stage] of data.stages.entries()) {
        const saved = await tx.workflowStage.create({
          data: {
            workflowId: id,
            title: stage.title,
            description: stage.summary,
            iconKey: stage.iconKey,
            sortOrder: position,
          },
        });
        const groups = [
          ["INPUT", stage.inputs],
          ["ACTION", stage.actions],
          ["DONE", stage.done],
          ["OUTPUT", stage.outputs],
        ] as const;
        for (const [itemType, values] of groups)
          await tx.workflowItem.createMany({
            data: values.map((content, sortOrder) => ({
              stageId: saved.id,
              itemType,
              content,
              sortOrder,
            })),
          });
      }
      await tx.auditLog.create({
        data: {
          actorId,
          action: "workflow.publish",
          resourceType: "workflow",
          resourceId: id,
          ipAddress: ip ?? null,
          metadata: { version: nextVersion },
        },
      });
      return { id, version: nextVersion };
    });
  }

  async knowledgeSources() {
    const sources = await this.prisma.knowledgeSource.findMany({
      orderBy: { name: "asc" },
    });
    return sources.map((source) => ({
      ...source,
      excludedTokens: Array.isArray(source.excludedTokens)
        ? source.excludedTokens.filter(
            (token): token is string => typeof token === "string",
          )
        : [],
      lastSuccessAt: source.lastSuccessAt?.toISOString() ?? null,
    }));
  }

  async createKnowledgeSource(input: unknown, actorId: string, ip?: string) {
    const data = createKnowledgeSourceSchema.parse(input);
    return this.prisma.$transaction(async (tx) => {
      const source = await tx.knowledgeSource.create({
        data: {
          name: data.name,
          spaceId: data.spaceId,
          rootNodeToken: data.rootNodeToken,
          excludedTokens: data.excludedTokens,
          intervalMins: data.intervalMins,
          enabled: data.enabled,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId,
          action: "knowledge-source.create",
          resourceType: "knowledge-source",
          resourceId: source.id,
          ipAddress: ip ?? null,
          metadata: { version: source.version },
        },
      });
      return { id: source.id, version: source.version };
    });
  }

  async updateKnowledgeSource(
    id: string,
    input: unknown,
    actorId: string,
    ip?: string,
  ) {
    const data = saveKnowledgeSourceSchema.parse(input);
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.knowledgeSource.findUnique({ where: { id } });
      if (!current)
        throw new NotFoundException({
          code: "KNOWLEDGE_SOURCE_NOT_FOUND",
          message: "飞书知识源不存在",
        });
      if (current.version !== data.expectedVersion)
        throw new ConflictException({
          code: "VERSION_CONFLICT",
          message: "飞书知识源配置已更新",
        });
      const source = await tx.knowledgeSource.update({
        where: { id },
        data: {
          name: data.name,
          spaceId: data.spaceId,
          rootNodeToken: data.rootNodeToken,
          excludedTokens: data.excludedTokens,
          intervalMins: data.intervalMins,
          enabled: data.enabled,
          version: { increment: 1 },
        },
      });
      await tx.auditLog.create({
        data: {
          actorId,
          action: "knowledge-source.publish",
          resourceType: "knowledge-source",
          resourceId: source.id,
          ipAddress: ip ?? null,
          metadata: { fromVersion: current.version, toVersion: source.version },
        },
      });
      return { id: source.id, version: source.version };
    });
  }

  async requestSync(
    kind: "ORGANIZATION" | "WIKI",
    actorId: string,
    ip?: string,
  ) {
    const run = await this.prisma.syncRun.create({
      data: { kind, status: "RUNNING" },
    });
    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: "sync.request",
        resourceType: "sync-run",
        resourceId: run.id,
        ipAddress: ip ?? null,
        metadata: { kind },
      },
    });
    return { id: run.id, status: run.status };
  }

  syncRuns() {
    return this.prisma.syncRun.findMany({
      orderBy: { startedAt: "desc" },
      take: 100,
    });
  }

  auditLogs() {
    return this.prisma.auditLog.findMany({
      include: { actor: { select: { displayName: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  resourceRevisions(type: string, id: string, role: Role) {
    this.assertResourceRole(type, role);
    return this.prisma.resourceRevision.findMany({
      where: { resourceType: type, resourceId: id },
      orderBy: { version: "desc" },
    });
  }

  async rollbackResource(
    type: string,
    id: string,
    input: { revisionId?: unknown; expectedVersion?: unknown },
    actorId: string,
    role: Role,
    ip?: string,
  ) {
    this.assertResourceRole(type, role);
    if (
      typeof input.revisionId !== "string" ||
      typeof input.expectedVersion !== "number"
    ) {
      throw new ConflictException({
        code: "INVALID_ROLLBACK",
        message: "回滚参数无效",
      });
    }
    const revision = await this.prisma.resourceRevision.findFirst({
      where: { id: input.revisionId, resourceType: type, resourceId: id },
    });
    if (
      !revision ||
      typeof revision.payload !== "object" ||
      Array.isArray(revision.payload) ||
      revision.payload === null
    ) {
      throw new NotFoundException({
        code: "REVISION_NOT_FOUND",
        message: "历史版本不存在",
      });
    }
    const payload = {
      ...(revision.payload as Record<string, unknown>),
      expectedVersion: input.expectedVersion,
    };
    if (type === "workflow")
      return this.updateWorkflow(id, payload, actorId, ip);
    if (type === "system-link")
      return this.updateSystemLink(id, payload, actorId, ip);
    throw new NotFoundException({
      code: "RESOURCE_TYPE_UNSUPPORTED",
      message: "该资源不支持回滚",
    });
  }

  private assertSafeUrl(value: string) {
    const allowed = (process.env.SYSTEM_LINK_ALLOWED_HOSTS ?? "")
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);
    if (!isAllowedSystemUrl(value, allowed)) {
      throw new ConflictException({
        code: "UNSAFE_SYSTEM_URL",
        message: "系统入口必须使用已批准的 HTTPS 域名",
      });
    }
  }

  private assertResourceRole(type: string, role: Role) {
    if (type !== "workflow" && role !== "ADMIN")
      throw new ForbiddenException({
        code: "RESOURCE_FORBIDDEN",
        message: "当前角色不能管理该资源",
      });
  }
}
