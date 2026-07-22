import { createReadStream } from "node:fs";
import { access } from "node:fs/promises";
import { resolve, sep } from "node:path";
import type { Readable } from "node:stream";
import {
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import OSS from "ali-oss";

const notFound = () =>
  new NotFoundException({
    code: "ASSET_NOT_FOUND",
    message: "图片不存在",
  });

const unavailable = () =>
  new ServiceUnavailableException({
    code: "ASSET_STORAGE_UNAVAILABLE",
    message: "图片暂不可用",
  });

function isOssNotFound(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const value = error as { code?: unknown; status?: unknown };
  return value.status === 404 || value.code === "NoSuchKey";
}

@Injectable()
export class AssetsService {
  async stream(objectKey: string): Promise<Readable> {
    const oss = this.ossClient();
    if (oss) {
      try {
        const result = await oss.getStream(objectKey);
        if (!result.stream) throw unavailable();
        return result.stream as Readable;
      } catch (error) {
        if (isOssNotFound(error)) throw notFound();
        if (
          error instanceof NotFoundException ||
          error instanceof ServiceUnavailableException
        )
          throw error;
        throw unavailable();
      }
    }

    if (process.env.NODE_ENV === "production") throw unavailable();

    const root = resolve(
      process.env.PRIVATE_ASSET_ROOT ??
        resolve(process.cwd(), "../../seed/private"),
    );
    const file = resolve(root, objectKey);
    if (file !== root && !file.startsWith(`${root}${sep}`)) throw notFound();
    try {
      await access(file);
      return createReadStream(file);
    } catch {
      throw notFound();
    }
  }

  private ossClient() {
    const {
      OSS_REGION,
      OSS_ENDPOINT,
      OSS_BUCKET,
      OSS_ACCESS_KEY_ID,
      OSS_ACCESS_KEY_SECRET,
    } = process.env;
    if (
      !OSS_REGION ||
      !OSS_ENDPOINT ||
      !OSS_BUCKET ||
      !OSS_ACCESS_KEY_ID ||
      !OSS_ACCESS_KEY_SECRET
    )
      return null;
    return new OSS({
      region: OSS_REGION,
      endpoint: OSS_ENDPOINT,
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
