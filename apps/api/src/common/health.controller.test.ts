import { ServiceUnavailableException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { IS_PUBLIC } from "../auth/auth.decorators.js";
import { HealthController } from "./health.controller.js";

describe("HealthController", () => {
  it("exposes liveness and readiness without an application session", async () => {
    const query = vi.fn(async () => [{ value: 1 }]);
    const controller = new HealthController({ $queryRaw: query } as never);

    expect(Reflect.getMetadata(IS_PUBLIC, controller.health)).toBe(true);
    expect(Reflect.getMetadata(IS_PUBLIC, controller.ready)).toBe(true);
    expect(controller.health()).toEqual({ status: "ok" });
    await expect(controller.ready()).resolves.toEqual({ status: "ready" });
    expect(query).toHaveBeenCalledOnce();
  });

  it("returns a controlled not-ready error when the database is unavailable", async () => {
    const controller = new HealthController({
      $queryRaw: vi.fn(async () => Promise.reject(new Error("offline"))),
    } as never);

    await expect(controller.ready()).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
  });
});
