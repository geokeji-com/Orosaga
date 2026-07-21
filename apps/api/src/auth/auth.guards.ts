import { createHash, timingSafeEqual } from "node:crypto";
import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { IS_PUBLIC, ROLES } from "./auth.decorators.js";
import { PrismaService } from "../prisma/prisma.service.js";

const rank = { EMPLOYEE: 1, EDITOR: 2, ADMIN: 3 } as const;
const digest = (value: string) =>
  createHash("sha256").update(value).digest("hex");

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext) {
    if (
      this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
        context.getHandler(),
        context.getClass(),
      ])
    )
      return true;
    const req = context.switchToHttp().getRequest<Request>();
    const raw = req.cookies?.orosaga_session as string | undefined;
    if (!raw)
      throw new UnauthorizedException({
        code: "AUTH_REQUIRED",
        message: "请先登录",
      });
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: digest(raw) },
      include: { user: true },
    });
    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= new Date() ||
      session.user.status !== "ACTIVE"
    ) {
      throw new UnauthorizedException({
        code: "SESSION_EXPIRED",
        message: "会话已失效",
      });
    }
    req.auth = {
      userId: session.userId,
      role: session.user.role,
      csrfHash: session.csrfHash,
    };
    return true;
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(context: ExecutionContext) {
    const roles = this.reflector.getAllAndOverride<Array<keyof typeof rank>>(
      ROLES,
      [context.getHandler(), context.getClass()],
    );
    if (!roles?.length) return true;
    const auth = context.switchToHttp().getRequest<Request>().auth;
    return Boolean(auth && roles.some((role) => rank[auth.role] >= rank[role]));
  }
}

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request>();
    if (["GET", "HEAD", "OPTIONS"].includes(req.method) || !req.auth)
      return true;
    const header = req.header("x-csrf-token") ?? "";
    const actual = Buffer.from(digest(header));
    const expected = Buffer.from(req.auth.csrfHash);
    return (
      actual.length === expected.length && timingSafeEqual(actual, expected)
    );
  }
}
