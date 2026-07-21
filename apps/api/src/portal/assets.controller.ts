import { createReadStream } from "node:fs";
import { access } from "node:fs/promises";
import { resolve } from "node:path";
import { Controller, Get, NotFoundException, Param, Res } from "@nestjs/common";
import type { Response } from "express";
import OSS from "ali-oss";
import { PrismaService } from "../prisma/prisma.service.js";

@Controller("api/v1/assets")
export class AssetsController {
  constructor(private prisma: PrismaService) {}

  @Get(":id")
  async read(@Param("id") id: string, @Res() res: Response) {
    const asset = await this.prisma.asset.findUnique({ where: { id } });
    if (!asset)
      throw new NotFoundException({
        code: "ASSET_NOT_FOUND",
        message: "图片不存在",
      });
    const oss = this.ossClient();
    if (oss) {
      const signedUrl = await oss.signatureUrlV4(
        "GET",
        300,
        undefined,
        asset.objectKey,
      );
      res.setHeader("cache-control", "private, no-store");
      res.redirect(302, signedUrl);
      return;
    }
    const root = resolve(
      process.env.PRIVATE_ASSET_ROOT ??
        resolve(process.cwd(), "../../seed/private"),
    );
    const file = resolve(root, asset.objectKey);
    if (!file.startsWith(`${root}/`)) throw new NotFoundException();
    try {
      await access(file);
    } catch {
      throw new NotFoundException({
        code: "ASSET_NOT_FOUND",
        message: "图片不存在",
      });
    }
    res.setHeader("content-type", asset.mimeType);
    res.setHeader("cache-control", "private, max-age=300");
    createReadStream(file).pipe(res);
  }

  private ossClient() {
    const { OSS_REGION, OSS_BUCKET, OSS_ACCESS_KEY_ID, OSS_ACCESS_KEY_SECRET } =
      process.env;
    if (
      !OSS_REGION ||
      !OSS_BUCKET ||
      !OSS_ACCESS_KEY_ID ||
      !OSS_ACCESS_KEY_SECRET
    )
      return null;
    return new OSS({
      region: OSS_REGION,
      bucket: OSS_BUCKET,
      accessKeyId: OSS_ACCESS_KEY_ID,
      accessKeySecret: OSS_ACCESS_KEY_SECRET,
      ...(process.env.OSS_STS_TOKEN
        ? { stsToken: process.env.OSS_STS_TOKEN }
        : {}),
      secure: true,
      authorizationV4: true,
    });
  }
}
