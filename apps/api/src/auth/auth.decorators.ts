import { createParamDecorator, SetMetadata } from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";

export const IS_PUBLIC = "isPublic";
export const ROLES = "roles";
export const Public = () => SetMetadata(IS_PUBLIC, true);
export const Roles = (...roles: Array<"EMPLOYEE" | "EDITOR" | "ADMIN">) =>
  SetMetadata(ROLES, roles);
export const CurrentAuth = createParamDecorator(
  (_data: unknown, context: ExecutionContext) => {
    return context.switchToHttp().getRequest().auth;
  },
);
