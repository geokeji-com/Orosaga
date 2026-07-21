import {
  ArgumentsHost,
  Catch,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import type { ExceptionFilter } from "@nestjs/common";
import type { Request, Response } from "express";
import { ZodError } from "zod";

@Catch()
export class HttpErrorFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp();
    const req = http.getRequest<Request>();
    const res = http.getResponse<Response>();
    const status =
      error instanceof ZodError
        ? HttpStatus.BAD_REQUEST
        : error instanceof HttpException
          ? error.getStatus()
          : HttpStatus.INTERNAL_SERVER_ERROR;
    const raw =
      error instanceof HttpException ? error.getResponse() : undefined;
    const payload = typeof raw === "object" && raw ? raw : {};
    const details = payload as {
      code?: string;
      message?: string | string[];
      fieldErrors?: unknown;
    };
    const message = Array.isArray(details.message)
      ? details.message.join("; ")
      : details.message;
    const fieldErrors =
      error instanceof ZodError
        ? Object.fromEntries(
            Object.entries(
              error.issues.reduce<Record<string, string[]>>((result, issue) => {
                const field = issue.path.join(".") || "_root";
                result[field] = [...(result[field] ?? []), issue.message];
                return result;
              }, {}),
            ),
          )
        : details.fieldErrors;
    if (status >= 500)
      console.error(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: "error",
          event: "http_error",
          requestId: req.requestId,
          message: error instanceof Error ? error.message : "unknown error",
        }),
      );
    res.status(status).json({
      code:
        error instanceof ZodError
          ? "VALIDATION_ERROR"
          : (details.code ??
            (status === 500 ? "INTERNAL_ERROR" : `HTTP_${status}`)),
      message:
        error instanceof ZodError
          ? "请求字段校验失败"
          : (message ?? (status === 500 ? "服务暂时不可用" : "请求失败")),
      requestId: req.requestId,
      fieldErrors,
    });
  }
}
