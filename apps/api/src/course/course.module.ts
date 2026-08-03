import { Module } from "@nestjs/common";
import {
  CourseController,
  CourseEnrollmentController,
} from "./course.controller.js";
import { CourseAccessGuard } from "./course-access.guard.js";
import { CourseService } from "./course.service.js";

@Module({
  controllers: [CourseController, CourseEnrollmentController],
  providers: [CourseAccessGuard, CourseService],
})
export class CourseModule {}
