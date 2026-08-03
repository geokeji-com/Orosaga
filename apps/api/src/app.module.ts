import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { AdminModule } from "./admin/admin.module.js";
import { AssessmentModule } from "./assessment/assessment.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { HealthController } from "./common/health.controller.js";
import { requestIdMiddleware } from "./common/request-id.middleware.js";
import { ContentModule } from "./content/content.module.js";
import { CourseModule } from "./course/course.module.js";
import { PortalModule } from "./portal/portal.module.js";
import { PrismaModule } from "./prisma/prisma.module.js";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    ContentModule,
    PortalModule,
    AdminModule,
    AssessmentModule,
    CourseModule,
  ],
  controllers: [HealthController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(requestIdMiddleware).forRoutes("*");
  }
}
