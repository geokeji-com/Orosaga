import { randomUUID } from "node:crypto";
import type { NextFunction, Request, Response } from "express";

export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const startedAt = performance.now();
  const incoming = req.header("x-request-id");
  const requestId =
    incoming && incoming.length <= 128 ? incoming : randomUUID();
  req.requestId = requestId;
  res.setHeader("x-request-id", requestId);
  res.on("finish", () => {
    console.log(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: "info",
        event: "http_request",
        requestId,
        method: req.method,
        path: req.path,
        status: res.statusCode,
        durationMs: Math.round((performance.now() - startedAt) * 100) / 100,
      }),
    );
  });
  next();
}

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      auth?: {
        userId: string;
        role: "EMPLOYEE" | "EDITOR" | "ADMIN";
        csrfHash: string;
      };
    }
  }
}
