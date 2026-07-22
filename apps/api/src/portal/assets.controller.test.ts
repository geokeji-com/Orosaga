import type { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Response } from "express";
import type { Readable } from "node:stream";
import { describe, expect, it, vi } from "vitest";
import { SessionGuard } from "../auth/auth.guards.js";
import { AssetsController } from "./assets.controller.js";

const asset = {
  id: "a4dcbad1-a944-4453-b556-b934935fe6b8",
  objectKey: "team/avatar.png",
  mimeType: "image/png",
  sha256: "a".repeat(64),
  size: 99,
};

function responseDouble() {
  const response = {
    setHeader: vi.fn(),
    status: vi.fn(),
    end: vi.fn(),
  };
  response.status.mockReturnValue(response);
  return response as unknown as Response;
}

function controllerFor(
  record: typeof asset | null = asset,
  stream = { pipe: vi.fn() } as unknown as Readable,
) {
  const prisma = {
    asset: { findUnique: vi.fn().mockResolvedValue(record) },
  };
  const assets = { stream: vi.fn().mockResolvedValue(stream) };
  return {
    controller: new AssetsController(prisma as never, assets as never),
    prisma,
    assets,
    stream,
  };
}

describe("AssetsController", () => {
  it("returns authenticated assets as same-origin bytes with private headers", async () => {
    const { controller, assets, stream } = controllerFor();
    const response = responseDouble();

    await controller.read(asset.id, response);

    expect(assets.stream).toHaveBeenCalledWith(asset.objectKey);
    expect(response.setHeader).toHaveBeenCalledWith(
      "content-type",
      "image/png",
    );
    expect(response.setHeader).toHaveBeenCalledWith(
      "content-length",
      asset.size.toString(),
    );
    expect(response.setHeader).toHaveBeenCalledWith(
      "etag",
      `"${asset.sha256}"`,
    );
    expect(response.setHeader).toHaveBeenCalledWith(
      "cache-control",
      "private, max-age=300",
    );
    expect(response.setHeader).toHaveBeenCalledWith(
      "x-content-type-options",
      "nosniff",
    );
    expect(response.status).toHaveBeenCalledWith(200);
    expect(stream.pipe).toHaveBeenCalledWith(response);
  });

  it("downgrades untrusted MIME metadata instead of reflecting it", async () => {
    const unsafeAsset = { ...asset, mimeType: "image/svg+xml" };
    const { controller } = controllerFor(unsafeAsset);
    const response = responseDouble();

    await controller.read(asset.id, response);

    expect(response.setHeader).toHaveBeenCalledWith(
      "content-type",
      "application/octet-stream",
    );
  });

  it("does not access storage for an unknown asset id", async () => {
    const { controller, assets } = controllerFor(null);

    await expect(
      controller.read(asset.id, responseDouble()),
    ).rejects.toMatchObject({
      response: { code: "ASSET_NOT_FOUND", message: "图片不存在" },
    });
    expect(assets.stream).not.toHaveBeenCalled();
  });

  it("is still rejected for anonymous requests by the global session guard", async () => {
    const session = { findUnique: vi.fn() };
    const guard = new SessionGuard(new Reflector(), { session } as never);
    const context = {
      getHandler: () => AssetsController.prototype.read,
      getClass: () => AssetsController,
      switchToHttp: () => ({ getRequest: () => ({ cookies: {} }) }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toMatchObject({
      response: { code: "AUTH_REQUIRED", message: "请先登录" },
    });
    expect(session.findUnique).not.toHaveBeenCalled();
  });
});
