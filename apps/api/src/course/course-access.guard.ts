import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import type { Request } from "express";
import { courseDefinition } from "./course-catalog.js";

type CourseAuth = NonNullable<Request["auth"]>;
type CoursePackProfile = "PILOT" | "RELEASE";

export function canAccessCurrentCourse(
  auth: CourseAuth | undefined,
  pilotUserIds = process.env.COURSE_PILOT_USER_IDS ?? "",
  packProfile: CoursePackProfile = courseDefinition.packProfile,
) {
  if (!auth) return false;
  if (packProfile === "RELEASE") return true;
  if (auth.role === "ADMIN" || auth.role === "EDITOR") return true;
  return new Set(
    pilotUserIds
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean),
  ).has(auth.userId);
}

@Injectable()
export class CourseAccessGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const auth = context.switchToHttp().getRequest<Request>().auth;
    if (canAccessCurrentCourse(auth)) return true;
    throw new ForbiddenException({
      code: "COURSE_PILOT_ACCESS_REQUIRED",
      message: "当前课程仍在授权试学阶段",
    });
  }
}
