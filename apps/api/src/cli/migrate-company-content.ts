import { Prisma } from "@prisma/client";
import { companyContentPayloadSchema } from "@orosaga/contracts";
import { companyDefaultContent } from "../content/company-default.js";
import { runOperation } from "./prisma.js";

void runOperation(async (prisma) => {
  const result = await prisma.$transaction(async (tx) => {
    const page = await tx.contentPage.findUnique({
      where: { slug: "company" },
      include: { currentRevision: true },
    });
    if (!page?.currentRevision) throw new Error("company page is missing");
    if (
      companyContentPayloadSchema.safeParse(page.currentRevision.payload)
        .success
    )
      return { changed: false, pageId: page.id, version: page.version };

    const actor = await tx.user.findFirst({
      where: { role: { in: ["ADMIN", "EDITOR"] }, status: "ACTIVE" },
      orderBy: { createdAt: "asc" },
    });
    if (!actor) throw new Error("an active admin or editor is required");
    const nextVersion = page.version + 1;
    const revision = await tx.contentRevision.create({
      data: {
        pageId: page.id,
        version: nextVersion,
        actorId: actor.id,
        changeSummary: "迁移为公司页专用结构化内容",
        payload: companyDefaultContent as Prisma.InputJsonValue,
      },
    });
    await tx.contentPage.update({
      where: { id: page.id },
      data: { version: nextVersion, currentRevisionId: revision.id },
    });
    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        action: "content.company-schema-migrate",
        resourceType: "page",
        resourceId: page.id,
        metadata: { fromVersion: page.version, toVersion: nextVersion },
      },
    });
    return { changed: true, pageId: page.id, version: nextVersion };
  });
  console.log(
    JSON.stringify({ operation: "migrate-company-content", ...result }),
  );
}).catch((error: unknown) => {
  console.error(
    JSON.stringify({
      operation: "migrate-company-content",
      ok: false,
      error: error instanceof Error ? error.message : "unknown error",
    }),
  );
  process.exitCode = 1;
});
