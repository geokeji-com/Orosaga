import { describe, expect, it } from "vitest";
import {
  databaseSchemaFromUrl,
  serverEnvSchema,
  workerEnvSchema,
} from "./index.js";

const productionDatabase = {
  DATABASE_URL:
    "postgresql://user:secret@db.pg.rds.aliyuncs.com:5432/yishan_verse?schema=orosaga&sslmode=disable",
  DATABASE_ALLOW_PLAINTEXT_INTERNAL: "true",
};

describe("server environment", () => {
  it("extracts the runtime schema for Prisma driver adapters", () => {
    expect(databaseSchemaFromUrl(productionDatabase.DATABASE_URL)).toBe(
      "orosaga",
    );
    expect(databaseSchemaFromUrl("postgresql://db/test")).toBe("public");
    expect(() =>
      databaseSchemaFromUrl("postgresql://db/test?schema=bad-name"),
    ).toThrow("valid PostgreSQL identifier");
  });

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
      ...productionDatabase,
      PUBLIC_ORIGIN: "https://orosaga.example.com",
      SESSION_SECRET: "x".repeat(32),
      FEISHU_APP_ID: "cli",
      FEISHU_APP_SECRET: "secret",
      FEISHU_REDIRECT_URI: "https://orosaga.example.com/auth/feishu/callback",
    };
    expect(serverEnvSchema.safeParse(base).success).toBe(false);
    const production = {
      ...base,
      OSS_REGION: "oss-cn-hangzhou",
      OSS_ENDPOINT: "oss-cn-hangzhou-internal.aliyuncs.com",
      OSS_BUCKET: "private-bucket",
      OSS_ACCESS_KEY_ID: "key-id",
      OSS_ACCESS_KEY_SECRET: "key-secret",
    };
    expect(serverEnvSchema.safeParse(production).success).toBe(true);
    expect(
      serverEnvSchema.safeParse({ ...production, OSS_ENDPOINT: undefined })
        .success,
    ).toBe(false);
  });

  it("rejects development auth and local asset fallbacks in production", () => {
    const production = {
      NODE_ENV: "production",
      ...productionDatabase,
      PUBLIC_ORIGIN: "https://orosaga.example.com",
      SESSION_SECRET: "x".repeat(32),
      FEISHU_APP_ID: "cli",
      FEISHU_APP_SECRET: "secret",
      FEISHU_REDIRECT_URI: "https://orosaga.example.com/auth/feishu/callback",
      OSS_REGION: "oss-cn-hangzhou",
      OSS_ENDPOINT: "oss-cn-hangzhou-internal.aliyuncs.com",
      OSS_BUCKET: "private-bucket",
      OSS_ACCESS_KEY_ID: "key-id",
      OSS_ACCESS_KEY_SECRET: "key-secret",
    };

    expect(
      serverEnvSchema.safeParse({
        ...production,
        AUTH_DEV_BYPASS: "true",
      }).success,
    ).toBe(false);
    expect(
      serverEnvSchema.safeParse({
        ...production,
        PRIVATE_ASSET_ROOT: "/app/seed/private",
      }).success,
    ).toBe(false);
  });

  it("requires an explicit internal plaintext database configuration", () => {
    const production = {
      NODE_ENV: "production",
      ...productionDatabase,
      PUBLIC_ORIGIN: "https://orosaga.example.com",
      SESSION_SECRET: "x".repeat(32),
      FEISHU_APP_ID: "cli",
      FEISHU_APP_SECRET: "secret",
      FEISHU_REDIRECT_URI: "https://orosaga.example.com/auth/feishu/callback",
      OSS_REGION: "oss-cn-hangzhou",
      OSS_ENDPOINT: "oss-cn-hangzhou-internal.aliyuncs.com",
      OSS_BUCKET: "private-bucket",
      OSS_ACCESS_KEY_ID: "key-id",
      OSS_ACCESS_KEY_SECRET: "key-secret",
    };
    expect(serverEnvSchema.safeParse(production).success).toBe(true);
    expect(
      serverEnvSchema.safeParse({
        ...production,
        DATABASE_ALLOW_PLAINTEXT_INTERNAL: "false",
      }).success,
    ).toBe(false);
    expect(
      serverEnvSchema.safeParse({
        ...production,
        DATABASE_URL: production.DATABASE_URL.replace("disable", "prefer"),
      }).success,
    ).toBe(false);
    expect(
      serverEnvSchema.safeParse({
        ...production,
        DATABASE_URL: production.DATABASE_URL.replace(
          "db.pg.rds.aliyuncs.com",
          "127.0.0.1",
        ),
      }).success,
    ).toBe(false);
  });

  it("rejects production deployment placeholders", () => {
    const placeholder = {
      NODE_ENV: "production",
      DATABASE_URL:
        "postgresql://USER:PASSWORD@RDS_HOST:5432/yishan_verse?schema=orosaga&sslmode=disable",
      DATABASE_ALLOW_PLAINTEXT_INTERNAL: "true",
      PUBLIC_ORIGIN: "https://orosaga.example.com",
      SESSION_SECRET: ["GENERATE", "AT_LEAST_32_RANDOM_CHARACTERS"].join("_"),
      FEISHU_APP_ID: "SET_ON_SERVER",
      FEISHU_APP_SECRET: "SET_ON_SERVER",
      FEISHU_REDIRECT_URI: "https://orosaga.example.com/auth/feishu/callback",
      OSS_REGION: "oss-cn-hangzhou",
      OSS_ENDPOINT: "oss-cn-hangzhou-internal.aliyuncs.com",
      OSS_BUCKET: "private-bucket",
      OSS_ACCESS_KEY_ID: "SET_ON_SERVER",
      OSS_ACCESS_KEY_SECRET: "SET_ON_SERVER",
    };
    expect(serverEnvSchema.safeParse(placeholder).success).toBe(false);
  });

  it("validates a minimal worker environment without API secrets", () => {
    expect(
      workerEnvSchema.safeParse({
        NODE_ENV: "production",
        ...productionDatabase,
        FEISHU_APP_ID: "cli",
        FEISHU_APP_SECRET: "secret",
      }).success,
    ).toBe(true);
  });
});
