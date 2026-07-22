import { randomUUID } from "node:crypto";

type PrivacyClient = {
  getBucketACL(bucket: string): Promise<{ acl: string }>;
  put(
    key: string,
    value: Buffer,
    options: { headers: Record<string, string> },
  ): Promise<unknown>;
  delete(key: string): Promise<unknown>;
};

export async function assertPrivateBeforeUpload(
  oss: PrivacyClient,
  bucket: string,
  anonymousUrl: (key: string) => string,
  request: typeof fetch = fetch,
) {
  const acl = await oss.getBucketACL(bucket);
  if (acl.acl !== "private")
    throw new Error("OSS bucket ACL must be private before avatar upload");
  const canaryKey = `preflight/private-${randomUUID()}.txt`;
  let created = false;
  try {
    await oss.put(canaryKey, Buffer.from("private-access-check"), {
      headers: {
        "Content-Type": "text/plain",
        "x-oss-object-acl": "private",
      },
    });
    created = true;
    const anonymous = await request(anonymousUrl(canaryKey), {
      method: "HEAD",
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
    });
    if (![401, 403, 404].includes(anonymous.status))
      throw new Error("OSS canary unexpectedly allows anonymous access");
    return anonymous.status;
  } finally {
    if (created) await oss.delete(canaryKey);
  }
}
