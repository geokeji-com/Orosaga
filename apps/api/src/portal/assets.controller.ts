import { Controller, Get, NotFoundException, Param, Res } from "@nestjs/common";
import type { Response } from "express";
import { PrismaService } from "../prisma/prisma.service.js";
import { AssetsService } from "./assets.service.js";

const allowedMimeTypes = new Set([
  "image/avif",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function controlledMimeType(mimeType: string) {
  const normalized = mimeType.trim().toLowerCase();
  return allowedMimeTypes.has(normalized)
    ? normalized
    : "application/octet-stream";
}

@Controller("api/v1/assets")
export class AssetsController {
  constructor(
    private prisma: PrismaService,
    private assets: AssetsService,
  ) {}

  @Get(":id")
  async read(@Param("id") id: string, @Res() res: Response) {
    const asset = await this.prisma.asset.findUnique({ where: { id } });
    if (!asset)
      throw new NotFoundException({
        code: "ASSET_NOT_FOUND",
        message: "图片不存在",
      });
    const stream = await this.assets.stream(asset.objectKey);
    res.setHeader("content-type", controlledMimeType(asset.mimeType));
    res.setHeader("content-length", asset.size.toString());
    res.setHeader("etag", `"${asset.sha256}"`);
    res.setHeader("cache-control", "private, max-age=300");
    res.setHeader("x-content-type-options", "nosniff");
    res.status(200);
    stream.pipe(res);
  }
}
