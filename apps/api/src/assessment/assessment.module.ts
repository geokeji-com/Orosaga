import { Module } from "@nestjs/common";
import {
  AssessmentAdminController,
  AssessmentAttemptController,
  AssessmentController,
} from "./assessment.controller.js";
import { AssessmentService } from "./assessment.service.js";

@Module({
  controllers: [
    AssessmentController,
    AssessmentAttemptController,
    AssessmentAdminController,
  ],
  providers: [AssessmentService],
})
export class AssessmentModule {}
