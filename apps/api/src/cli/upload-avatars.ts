import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import OSS from "ali-oss";
import { runOperation } from "./prisma.js";
import { assertPrivateBeforeUpload } from "./oss-private-preflight.js";

const digest = (bytes: Buffer) =>
  createHash("sha256").update(bytes).digest("hex");

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function client() {
  return new OSS({
    region: required("OSS_REGION"),
    endpoint: process.env.OSS_UPLOAD_ENDPOINT ?? required("OSS_ENDPOINT"),
    bucket: required("OSS_BUCKET"),
    accessKeyId: required("OSS_ACCESS_KEY_ID"),
    accessKeySecret: required("OSS_ACCESS_KEY_SECRET"),
    ...(process.env.OSS_STS_TOKEN
      ? { stsToken: process.env.OSS_STS_TOKEN }
      : {}),
    secure: true,
    authorizationV4: true,
  });
}

function publicObjectUrl(objectKey: string) {
  const bucket = required("OSS_BUCKET");
  const region = required("OSS_REGION");
  const encoded = objectKey.split("/").map(encodeURIComponent).join("/");
  return `https://${bucket}.${region}.aliyuncs.com/${encoded}`;
}

void runOperation(async (prisma) => {
  const root = resolve(required("PRIVATE_ASSET_ROOT"), "team");
  const filenames = (await readdir(root)).filter((name) =>
    name.endsWith(".png"),
  );
  const assets = await prisma.asset.findMany({
    where: { objectKey: { startsWith: "team/" } },
    orderBy: { objectKey: "asc" },
  });
  if (filenames.length !== 31 || assets.length !== 31)
    throw new Error(
      `Expected 31 local files and 31 asset rows; found ${filenames.length}/${assets.length}`,
    );

  const oss = client();
  const preflightAnonymousStatus = await assertPrivateBeforeUpload(
    oss,
    required("OSS_BUCKET"),
    publicObjectUrl,
  );
  let uploaded = 0;
  for (const asset of assets) {
    const filename = asset.objectKey.slice("team/".length);
    if (!filenames.includes(filename))
      throw new Error("Asset manifest does not match local inventory");
    const path = resolve(root, filename);
    const bytes = await readFile(path);
    if (bytes.length !== asset.size || digest(bytes) !== asset.sha256)
      throw new Error("Local asset failed size or hash verification");
    await oss.put(asset.objectKey, path, {
      headers: {
        "Content-Type": asset.mimeType,
        "x-oss-object-acl": "private",
      },
    });
    uploaded += 1;
  }

  let verified = 0;
  for (const asset of assets) {
    const remote = await oss.get(asset.objectKey);
    const bytes = Buffer.isBuffer(remote.content)
      ? remote.content
      : Buffer.from(remote.content);
    if (bytes.length !== asset.size || digest(bytes) !== asset.sha256)
      throw new Error("Remote asset failed size or hash verification");
    const headers = remote.res.headers as Record<string, unknown>;
    const contentType = String(headers["content-type"] ?? "");
    if (contentType.split(";")[0] !== asset.mimeType)
      throw new Error("Remote asset MIME does not match the manifest");
    verified += 1;
  }

  const anonymous = await fetch(publicObjectUrl(assets[0]!.objectKey), {
    method: "HEAD",
    redirect: "manual",
    signal: AbortSignal.timeout(10_000),
  });
  if (![401, 403, 404].includes(anonymous.status))
    throw new Error("Private OSS object unexpectedly allows anonymous access");

  console.log(
    JSON.stringify({
      operation: "upload-avatars",
      uploaded,
      verified,
      preflightAnonymousStatus,
      anonymousStatus: anonymous.status,
    }),
  );
}).catch((error: unknown) => {
  console.error(
    JSON.stringify({
      operation: "upload-avatars",
      ok: false,
      error: error instanceof Error ? error.message : "unknown error",
    }),
  );
  process.exitCode = 1;
});
