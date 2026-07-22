import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Readable } from "node:stream";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AssetsService } from "./assets.service.js";

const oss = vi.hoisted(() => ({
  getStream: vi.fn(),
  options: [] as Array<Record<string, unknown>>,
}));

vi.mock("ali-oss", () => ({
  default: class MockOss {
    constructor(options: Record<string, unknown>) {
      oss.options.push(options);
    }
    getStream = oss.getStream;
  },
}));

function configureOss() {
  vi.stubEnv("OSS_REGION", "oss-cn-hangzhou");
  vi.stubEnv("OSS_ENDPOINT", "oss-cn-hangzhou-internal.aliyuncs.com");
  vi.stubEnv("OSS_BUCKET", "private-bucket");
  vi.stubEnv("OSS_ACCESS_KEY_ID", "key-id");
  vi.stubEnv("OSS_ACCESS_KEY_SECRET", "key-secret");
}

describe("AssetsService", () => {
  beforeEach(() => {
    oss.getStream.mockReset();
    oss.options.length = 0;
    for (const field of [
      "OSS_REGION",
      "OSS_ENDPOINT",
      "OSS_BUCKET",
      "OSS_ACCESS_KEY_ID",
      "OSS_ACCESS_KEY_SECRET",
      "OSS_STS_TOKEN",
    ])
      vi.stubEnv(field, "");
  });

  afterEach(() => vi.unstubAllEnvs());

  it("streams private bytes through the configured OSS endpoint", async () => {
    configureOss();
    const stream = Readable.from("private-image");
    oss.getStream.mockResolvedValue({ stream });

    await expect(new AssetsService().stream("team/avatar.png")).resolves.toBe(
      stream,
    );
    expect(oss.getStream).toHaveBeenCalledWith("team/avatar.png");
    expect(oss.options[0]).toMatchObject({
      endpoint: "oss-cn-hangzhou-internal.aliyuncs.com",
      secure: true,
      authorizationV4: true,
    });
  });

  it("keeps the local file fallback in development", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const root = await mkdtemp(join(tmpdir(), "orosaga-assets-"));
    await writeFile(join(root, "avatar.png"), "local-image");
    vi.stubEnv("PRIVATE_ASSET_ROOT", root);

    await expect(
      new AssetsService().stream("avatar.png"),
    ).resolves.toBeInstanceOf(Readable);
  });

  it("never falls back to local files in production", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PRIVATE_ASSET_ROOT", "/does/not/matter");

    await expect(
      new AssetsService().stream("team/avatar.png"),
    ).rejects.toMatchObject({
      response: {
        code: "ASSET_STORAGE_UNAVAILABLE",
        message: "图片暂不可用",
      },
    });
  });

  it("does not expose OSS failure details", async () => {
    configureOss();
    oss.getStream.mockRejectedValue({
      status: 500,
      message: "key-secret at https://private-oss.example.invalid",
    });

    await expect(
      new AssetsService().stream("team/avatar.png"),
    ).rejects.toMatchObject({
      response: {
        code: "ASSET_STORAGE_UNAVAILABLE",
        message: "图片暂不可用",
      },
    });
  });
});
