import { describe, expect, it, vi } from "vitest";
import { assertPrivateBeforeUpload } from "./oss-private-preflight.js";

function client(acl: string) {
  return {
    getBucketACL: vi.fn().mockResolvedValue({ acl }),
    put: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
  };
}

describe("assertPrivateBeforeUpload", () => {
  it("fails before writing when the bucket ACL is not private", async () => {
    const oss = client("public-read");
    await expect(
      assertPrivateBeforeUpload(oss, "bucket", () => "https://example.com"),
    ).rejects.toThrow("must be private");
    expect(oss.put).not.toHaveBeenCalled();
  });

  it("removes the non-sensitive canary after anonymous denial", async () => {
    const oss = client("private");
    const request = vi.fn().mockResolvedValue({ status: 403 });
    await expect(
      assertPrivateBeforeUpload(
        oss,
        "bucket",
        (key) => `https://example.com/${key}`,
        request,
      ),
    ).resolves.toBe(403);
    expect(oss.put).toHaveBeenCalledOnce();
    expect(oss.delete).toHaveBeenCalledOnce();
  });

  it("deletes the canary and stops when anonymous access succeeds", async () => {
    const oss = client("private");
    const request = vi.fn().mockResolvedValue({ status: 200 });
    await expect(
      assertPrivateBeforeUpload(
        oss,
        "bucket",
        () => "https://example.com/canary",
        request,
      ),
    ).rejects.toThrow("allows anonymous access");
    expect(oss.delete).toHaveBeenCalledOnce();
  });
});
