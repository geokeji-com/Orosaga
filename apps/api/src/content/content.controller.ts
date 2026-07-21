import { Body, Controller, Get, Param, Post, Put, Req } from "@nestjs/common";
import type { Request } from "express";
import { CurrentAuth, Roles } from "../auth/auth.decorators.js";
import { ContentService } from "./content.service.js";

@Controller("api/v1/pages")
export class ContentController {
  constructor(private content: ContentService) {}

  @Get(":slug")
  bySlug(@Param("slug") slug: string) {
    return this.content.bySlug(slug);
  }
}

@Roles("EDITOR")
@Controller("api/v1/admin/pages")
export class AdminContentController {
  constructor(private content: ContentService) {}

  @Post()
  create(
    @Body() body: unknown,
    @CurrentAuth() auth: Express.Request["auth"],
    @Req() req: Request,
  ) {
    return this.content.create(body, auth!.userId, req.ip);
  }

  @Put(":id")
  save(
    @Param("id") id: string,
    @Body() body: unknown,
    @CurrentAuth() auth: Express.Request["auth"],
    @Req() req: Request,
  ) {
    return this.content.save(id, body, auth!.userId, req.ip);
  }

  @Get(":id/revisions")
  revisions(@Param("id") id: string) {
    return this.content.revisions(id);
  }

  @Post(":id/rollback")
  rollback(
    @Param("id") id: string,
    @Body() body: { revisionId: string; expectedVersion: number },
    @CurrentAuth() auth: Express.Request["auth"],
    @Req() req: Request,
  ) {
    return this.content.rollback(
      id,
      body.revisionId,
      body.expectedVersion,
      auth!.userId,
      req.ip,
    );
  }
}
