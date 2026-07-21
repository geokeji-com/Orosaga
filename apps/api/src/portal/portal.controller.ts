import { Controller, Get, Param, Query, Req } from "@nestjs/common";
import type { Request } from "express";
import { PortalService } from "./portal.service.js";

@Controller("api/v1")
export class PortalController {
  constructor(private portal: PortalService) {}

  @Get("navigation") navigation() {
    return this.portal.navigation();
  }
  @Get("organization/departments") departments() {
    return this.portal.departments();
  }

  @Get("organization/members")
  members(@Query() query: Record<string, string | undefined>) {
    return this.portal.members(query);
  }

  @Get("organization/members/:id") member(@Param("id") id: string) {
    return this.portal.member(id);
  }
  @Get("workflows/:slug") workflow(@Param("slug") slug: string) {
    return this.portal.workflow(slug);
  }

  @Get("system-links")
  systemLinks(@Req() req: Request) {
    return this.portal.systemLinks(req.auth!.role);
  }

  @Get("camps") camps() {
    return this.portal.camps();
  }

  @Get("search")
  search(
    @Query("q") q = "",
    @Query("type") type: string | undefined,
    @Req() req: Request,
  ) {
    return this.portal.search(q, req.auth!.role, type);
  }

  @Get("widgets/weather") weather() {
    return this.portal.weather();
  }
}
