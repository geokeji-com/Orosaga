import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import type { Request } from "express";

type CourseAuth = NonNullable<Request["auth"]>;

export function canAccessCurrentCourse(auth: CourseAuth | undefined) {
  return Boolean(auth);
}

@Injectable()
export class CourseAccessGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const auth = context.switchToHttp().getRequest<Request>().auth;
    return canAccessCurrentCourse(auth);
  }
}
