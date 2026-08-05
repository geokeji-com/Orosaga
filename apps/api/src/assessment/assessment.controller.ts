import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Req,
} from "@nestjs/common";
import type { Request } from "express";
import { CurrentAuth, Roles } from "../auth/auth.decorators.js";
import { AssessmentService } from "./assessment.service.js";

@Controller("api/v1/assessments")
export class AssessmentController {
  constructor(private assessment: AssessmentService) {}

  @Get(":slug")
  @Header("Cache-Control", "no-store")
  overview(
    @Param("slug") slug: string,
    @CurrentAuth() auth: Express.Request["auth"],
  ) {
    return this.assessment.overview(slug, auth!.userId);
  }

  @Post(":slug/attempts")
  @Header("Cache-Control", "no-store")
  create(
    @Param("slug") slug: string,
    @Body() body: unknown,
    @CurrentAuth() auth: Express.Request["auth"],
  ) {
    return this.assessment.createAttempt(slug, body, auth!.userId);
  }
}

@Controller("api/v1/assessment-attempts")
export class AssessmentAttemptController {
  constructor(private assessment: AssessmentService) {}

  @Get(":id")
  @Header("Cache-Control", "no-store")
  attempt(
    @Param("id") id: string,
    @CurrentAuth() auth: Express.Request["auth"],
  ) {
    return this.assessment.attempt(id, auth!.userId);
  }

  @Get(":id/questions/:position")
  @Header("Cache-Control", "no-store")
  question(
    @Param("id") id: string,
    @Param("position", ParseIntPipe) position: number,
    @CurrentAuth() auth: Express.Request["auth"],
  ) {
    return this.assessment.question(id, position, auth!.userId);
  }

  @Get(":id/review")
  @Header("Cache-Control", "no-store")
  review(
    @Param("id") id: string,
    @CurrentAuth() auth: Express.Request["auth"],
  ) {
    return this.assessment.review(id, auth!.userId);
  }

  @Put(":id/answers/:questionId")
  @Header("Cache-Control", "no-store")
  answer(
    @Param("id") id: string,
    @Param("questionId") questionId: string,
    @Body() body: unknown,
    @CurrentAuth() auth: Express.Request["auth"],
  ) {
    return this.assessment.saveAnswer(id, questionId, body, auth!.userId);
  }

  @Post(":id/submit")
  @Header("Cache-Control", "no-store")
  submit(
    @Param("id") id: string,
    @CurrentAuth() auth: Express.Request["auth"],
  ) {
    return this.assessment.submit(id, auth!.userId);
  }

  @Get(":id/report")
  @Header("Cache-Control", "no-store")
  report(
    @Param("id") id: string,
    @CurrentAuth() auth: Express.Request["auth"],
  ) {
    return this.assessment.report(id, auth!.userId);
  }
}

@Roles("ADMIN")
@Controller("api/v1/admin")
export class AssessmentAdminController {
  constructor(private assessment: AssessmentService) {}

  @Get("assessments")
  @Header("Cache-Control", "no-store")
  versions() {
    return this.assessment.adminVersions();
  }

  @Post("assessment-versions/:id/validate")
  validate(
    @Param("id") id: string,
    @CurrentAuth() auth: Express.Request["auth"],
    @Req() req: Request,
  ) {
    return this.assessment.validateVersion(id, auth!.userId, req.ip);
  }

  @Get("assessment-versions/:id/quality")
  @Header("Cache-Control", "no-store")
  quality(@Param("id") id: string) {
    return this.assessment.adminVersionQuality(id);
  }

  @Get("assessment-versions/:id/pilot-participants")
  @Header("Cache-Control", "no-store")
  pilotParticipants(@Param("id") id: string) {
    return this.assessment.pilotParticipants(id);
  }

  @Post("assessment-versions/:id/publish")
  publish(
    @Param("id") id: string,
    @CurrentAuth() auth: Express.Request["auth"],
    @Req() req: Request,
  ) {
    return this.assessment.publishVersion(id, auth!.userId, req.ip);
  }

  @Post("assessment-versions/:id/gates")
  gates(
    @Param("id") id: string,
    @Body() body: unknown,
    @CurrentAuth() auth: Express.Request["auth"],
    @Req() req: Request,
  ) {
    return this.assessment.approveVersionGates(id, body, auth!.userId, req.ip);
  }

  @Post("assessment-versions/:id/pilot-participants")
  grantPilotParticipant(
    @Param("id") id: string,
    @Body() body: unknown,
    @CurrentAuth() auth: Express.Request["auth"],
    @Req() req: Request,
  ) {
    return this.assessment.grantPilotParticipant(
      id,
      body,
      auth!.userId,
      req.ip,
    );
  }

  @Delete("assessment-versions/:id/pilot-participants/:userId")
  revokePilotParticipant(
    @Param("id") id: string,
    @Param("userId") userId: string,
    @CurrentAuth() auth: Express.Request["auth"],
    @Req() req: Request,
  ) {
    return this.assessment.revokePilotParticipant(
      id,
      userId,
      auth!.userId,
      req.ip,
    );
  }

  @Post("assessment-versions/:id/retire")
  retire(
    @Param("id") id: string,
    @CurrentAuth() auth: Express.Request["auth"],
    @Req() req: Request,
  ) {
    return this.assessment.retireVersion(id, auth!.userId, req.ip);
  }

  @Get("assessment-attempts")
  @Header("Cache-Control", "no-store")
  attempts() {
    return this.assessment.adminAttempts();
  }

  @Post("assessment-attempts/:id/void")
  void(
    @Param("id") id: string,
    @Body() body: unknown,
    @CurrentAuth() auth: Express.Request["auth"],
    @Req() req: Request,
  ) {
    return this.assessment.voidAttempt(id, body, auth!.userId, req.ip);
  }

  @Get("assessment-attempts/:id/report")
  @Header("Cache-Control", "no-store")
  report(
    @Param("id") id: string,
    @CurrentAuth() auth: Express.Request["auth"],
    @Req() req: Request,
  ) {
    return this.assessment.adminReport(id, auth!.userId, req.ip);
  }
}
