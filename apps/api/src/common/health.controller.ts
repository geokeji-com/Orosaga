import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { Public } from "../auth/auth.decorators.js";
import { PrismaService } from "../prisma/prisma.service.js";

@Controller()
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Public()
  @Get("healthz")
  health() {
    return { status: "ok" };
  }

  @Public()
  @Get("readyz")
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: "ready" };
    } catch {
      throw new ServiceUnavailableException({
        code: "NOT_READY",
        message: "数据库尚未就绪",
      });
    }
  }
}
