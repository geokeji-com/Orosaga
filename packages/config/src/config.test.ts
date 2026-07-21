import { describe, expect, it } from "vitest";
import { serverEnvSchema } from "./index.js";

describe("server environment", () => {
  it("rejects missing secrets and parses safe defaults", () => {
    expect(serverEnvSchema.safeParse({}).success).toBe(false);
    const parsed = serverEnvSchema.parse({
      DATABASE_URL: "postgresql://db",
      PUBLIC_ORIGIN: "https://orosaga.example.com",
      SESSION_SECRET: "x".repeat(32),
      FEISHU_APP_ID: "cli",
      FEISHU_APP_SECRET: "secret",
      FEISHU_REDIRECT_URI: "https://orosaga.example.com/auth/feishu/callback",
    });
    expect(parsed.SYNC_INTERVAL_MINUTES).toBe(30);
    expect(parsed.AUTH_DEV_BYPASS).toBe(false);
  });

  it("requires private OSS credentials in production", () => {
    const base = {
      NODE_ENV: "production",
      DATABASE_URL: "postgresql://db",
      PUBLIC_ORIGIN: "https://orosaga.example.com",
      SESSION_SECRET: "x".repeat(32),
      FEISHU_APP_ID: "cli",
      FEISHU_APP_SECRET: "secret",
      FEISHU_REDIRECT_URI: "https://orosaga.example.com/auth/feishu/callback",
    };
    expect(serverEnvSchema.safeParse(base).success).toBe(false);
    expect(
      serverEnvSchema.safeParse({
        ...base,
        OSS_REGION: "oss-cn-hangzhou",
        OSS_BUCKET: "private-bucket",
        OSS_ACCESS_KEY_ID: "key-id",
        OSS_ACCESS_KEY_SECRET: "key-secret",
      }).success,
    ).toBe(true);
  });
});
