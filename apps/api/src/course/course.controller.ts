import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { CurrentAuth } from "../auth/auth.decorators.js";
import { CourseAccessGuard } from "./course-access.guard.js";
import { CourseService } from "./course.service.js";

@Controller("api/v1/courses")
@UseGuards(CourseAccessGuard)
export class CourseController {
  constructor(private course: CourseService) {}

  @Get()
  @Header("Cache-Control", "private, no-store")
  list(@CurrentAuth() auth: Express.Request["auth"]) {
    return this.course.list(auth!.userId);
  }

  @Get(":slug")
  @Header("Cache-Control", "private, no-store")
  detail(
    @CurrentAuth() auth: Express.Request["auth"],
    @Param("slug") slug: string,
  ) {
    return this.course.detail(auth!.userId, slug);
  }

  @Post(":slug/enrollments")
  @Header("Cache-Control", "private, no-store")
  enroll(
    @CurrentAuth() auth: Express.Request["auth"],
    @Param("slug") slug: string,
    @Body() body: unknown,
  ) {
    return this.course.enroll(auth!.userId, slug, body);
  }
}

@Controller("api/v1/course-enrollments")
@UseGuards(CourseAccessGuard)
export class CourseEnrollmentController {
  constructor(private course: CourseService) {}

  @Get(":id")
  @Header("Cache-Control", "private, no-store")
  enrollment(
    @CurrentAuth() auth: Express.Request["auth"],
    @Param("id") id: string,
  ) {
    return this.course.enrollment(auth!.userId, id);
  }

  @Get(":id/lessons/:lessonKey")
  @Header("Cache-Control", "private, no-store")
  lesson(
    @CurrentAuth() auth: Express.Request["auth"],
    @Param("id") id: string,
    @Param("lessonKey") lessonKey: string,
    @Query("step") stepKey: string,
  ) {
    return this.course.lesson(auth!.userId, id, lessonKey, stepKey);
  }

  @Put(":id/steps/:stepKey")
  @Header("Cache-Control", "private, no-store")
  completeStep(
    @CurrentAuth() auth: Express.Request["auth"],
    @Param("id") id: string,
    @Param("stepKey") stepKey: string,
    @Body() body: unknown,
  ) {
    return this.course.completeStep(auth!.userId, id, stepKey, body);
  }

  @Post(":id/exercises/:exerciseKey/attempts")
  @Header("Cache-Control", "private, no-store")
  submitExercise(
    @CurrentAuth() auth: Express.Request["auth"],
    @Param("id") id: string,
    @Param("exerciseKey") exerciseKey: string,
    @Body() body: unknown,
  ) {
    return this.course.submitExercise(auth!.userId, id, exerciseKey, body);
  }

  @Get(":id/completion")
  @Header("Cache-Control", "private, no-store")
  completion(
    @CurrentAuth() auth: Express.Request["auth"],
    @Param("id") id: string,
  ) {
    return this.course.completion(auth!.userId, id);
  }

  @Put(":id/feedback")
  @Header("Cache-Control", "private, no-store")
  feedback(
    @CurrentAuth() auth: Express.Request["auth"],
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return this.course.saveFeedback(auth!.userId, id, body);
  }
}
