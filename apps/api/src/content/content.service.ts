import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";
import {
  contentPayloadSchema,
  saveContentPageSchema,
} from "@orosaga/contracts";
import { z } from "zod";
import { PrismaService } from "../prisma/prisma.service.js";

@Injectable()
export class ContentService {
  constructor(private prisma: PrismaService) {}

  async bySlug(slug: string) {
    const page = await this.prisma.contentPage.findUnique({
      where: { slug },
      include: { currentRevision: true },
    });
    if (!page?.currentRevision)
      throw new NotFoundException({
        code: "PAGE_NOT_FOUND",
        message: "页面不存在",
      });
    return {
      id: page.id,
      slug: page.slug,
      pageType: page.pageType,
      version: page.version,
      updatedAt: page.updatedAt.toISOString(),
      content: page.currentRevision.payload,
      permissions: ["content:read"],
    };
  }

  async create(input: unknown, actorId: string, actorIp?: string) {
    const data = z
      .object({
        slug: z.string().regex(/^[a-z0-9-]+$/),
        pageType: z.enum(["HOME", "COMPANY", "ARTICLE"]),
        payload: contentPayloadSchema,
        changeSummary: z.string().min(1).max(200),
      })
      .parse(input);
    return this.prisma.$transaction(async (tx) => {
      const page = await tx.contentPage.create({
        data: { slug: data.slug, pageType: data.pageType },
      });
      const revision = await tx.contentRevision.create({
        data: {
          pageId: page.id,
          version: 1,
          payload: data.payload as Prisma.InputJsonValue,
          changeSummary: data.changeSummary,
          actorId,
          actorIp: actorIp ?? null,
        },
      });
      const updated = await tx.contentPage.update({
        where: { id: page.id },
        data: { version: 1, currentRevisionId: revision.id },
      });
      await tx.auditLog.create({
        data: {
          actorId,
          action: "content.create",
          resourceType: "page",
          resourceId: page.id,
          ipAddress: actorIp ?? null,
          metadata: { version: 1 },
        },
      });
      return { id: updated.id, version: updated.version };
    });
  }

  async save(id: string, input: unknown, actorId: string, actorIp?: string) {
    const data = saveContentPageSchema.parse(input);
    return this.prisma.$transaction(async (tx) => {
      const page = await tx.contentPage.findUnique({ where: { id } });
      if (!page)
        throw new NotFoundException({
          code: "PAGE_NOT_FOUND",
          message: "页面不存在",
        });
      if (page.version !== data.expectedVersion)
        throw new ConflictException({
          code: "VERSION_CONFLICT",
          message: "内容已被他人更新",
        });
      const nextVersion = page.version + 1;
      const revision = await tx.contentRevision.create({
        data: {
          pageId: id,
          version: nextVersion,
          payload: data.content as Prisma.InputJsonValue,
          changeSummary: data.changeSummary,
          actorId,
          actorIp: actorIp ?? null,
        },
      });
      await tx.contentPage.update({
        where: { id },
        data: { version: nextVersion, currentRevisionId: revision.id },
      });
      await tx.auditLog.create({
        data: {
          actorId,
          action: "content.publish",
          resourceType: "page",
          resourceId: id,
          ipAddress: actorIp ?? null,
          metadata: { fromVersion: page.version, toVersion: nextVersion },
        },
      });
      return { id, version: nextVersion };
    });
  }

  revisions(id: string) {
    return this.prisma.contentRevision.findMany({
      where: { pageId: id },
      orderBy: { version: "desc" },
    });
  }

  async rollback(
    id: string,
    revisionId: string,
    expectedVersion: number,
    actorId: string,
    actorIp?: string,
  ) {
    const target = await this.prisma.contentRevision.findFirst({
      where: { id: revisionId, pageId: id },
    });
    if (!target)
      throw new NotFoundException({
        code: "REVISION_NOT_FOUND",
        message: "历史版本不存在",
      });
    return this.save(
      id,
      {
        expectedVersion,
        content: target.payload,
        changeSummary: `回滚到版本 ${target.version}`,
      },
      actorId,
      actorIp,
    );
  }
}
