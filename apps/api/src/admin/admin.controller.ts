import { Body, Controller, Get, Param, Post, Put, Req } from "@nestjs/common";
import type { Request } from "express";
import { CurrentAuth, Roles } from "../auth/auth.decorators.js";
import { AdminService } from "./admin.service.js";

@Roles("EDITOR")
@Controller("api/v1/admin/employees")
export class EmployeeAdminController {
  constructor(private admin: AdminService) {}
  @Put(":id/profile")
  update(
    @Param("id") id: string,
    @Body() body: unknown,
    @CurrentAuth() auth: Express.Request["auth"],
    @Req() req: Request,
  ) {
    return this.admin.updateProfile(id, body, auth!.userId, req.ip);
  }
}

@Roles("ADMIN")
@Controller("api/v1/admin")
export class AdminController {
  constructor(private admin: AdminService) {}

  @Put("users/:id/role")
  role(
    @Param("id") id: string,
    @Body() body: unknown,
    @CurrentAuth() auth: Express.Request["auth"],
    @Req() req: Request,
  ) {
    return this.admin.updateRole(id, body, auth!.userId, req.ip);
  }

  @Put("system-links/:id")
  link(
    @Param("id") id: string,
    @Body() body: unknown,
    @CurrentAuth() auth: Express.Request["auth"],
    @Req() req: Request,
  ) {
    return this.admin.updateSystemLink(id, body, auth!.userId, req.ip);
  }

  @Put("workflows/:id")
  @Roles("EDITOR")
  workflow(
    @Param("id") id: string,
    @Body() body: unknown,
    @CurrentAuth() auth: Express.Request["auth"],
    @Req() req: Request,
  ) {
    return this.admin.updateWorkflow(id, body, auth!.userId, req.ip);
  }

  @Get("sync-runs") syncRuns() {
    return this.admin.syncRuns();
  }
  @Get("audit-logs") auditLogs() {
    return this.admin.auditLogs();
  }
  @Get("resources/:type/:id/revisions")
  @Roles("EDITOR")
  revisions(
    @Param("type") type: string,
    @Param("id") id: string,
    @CurrentAuth() auth: Express.Request["auth"],
  ) {
    return this.admin.resourceRevisions(type, id, auth!.role);
  }
  @Post("resources/:type/:id/rollback")
  @Roles("EDITOR")
  rollback(
    @Param("type") type: string,
    @Param("id") id: string,
    @Body() body: { revisionId?: unknown; expectedVersion?: unknown },
    @CurrentAuth() auth: Express.Request["auth"],
    @Req() req: Request,
  ) {
    return this.admin.rollbackResource(
      type,
      id,
      body,
      auth!.userId,
      auth!.role,
      req.ip,
    );
  }

  @Get("knowledge-sources") sources() {
    return this.admin.knowledgeSources();
  }

  @Post("knowledge-sources")
  createSource(
    @Body() body: unknown,
    @CurrentAuth() auth: Express.Request["auth"],
    @Req() req: Request,
  ) {
    return this.admin.createKnowledgeSource(body, auth!.userId, req.ip);
  }

  @Put("knowledge-sources/:id")
  updateSource(
    @Param("id") id: string,
    @Body() body: unknown,
    @CurrentAuth() auth: Express.Request["auth"],
    @Req() req: Request,
  ) {
    return this.admin.updateKnowledgeSource(id, body, auth!.userId, req.ip);
  }

  @Post("sync/organization")
  organization(
    @CurrentAuth() auth: Express.Request["auth"],
    @Req() req: Request,
  ) {
    return this.admin.requestSync("ORGANIZATION", auth!.userId, req.ip);
  }

  @Post("sync/wiki")
  wiki(@CurrentAuth() auth: Express.Request["auth"], @Req() req: Request) {
    return this.admin.requestSync("WIKI", auth!.userId, req.ip);
  }
}
