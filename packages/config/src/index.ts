import { z } from "zod";

const booleanFromString = z
  .enum(["true", "false"])
  .default("false")
  .transform((value) => value === "true");

const placeholderPattern =
  /SET_ON_SERVER|GENERATE_AT_LEAST|USER:PASSWORD|RDS_HOST/;

function rejectPlaceholder(
  context: z.RefinementCtx,
  field: string,
  value: string | undefined,
) {
  if (value && placeholderPattern.test(value))
    context.addIssue({
      code: "custom",
      path: [field],
      message: `${field} contains a deployment placeholder`,
    });
}

type DatabaseTransportEnv = {
  DATABASE_URL: string;
  DATABASE_ALLOW_PLAINTEXT_INTERNAL: boolean;
};

export function databaseSchemaFromUrl(databaseUrl: string): string {
  let url: URL;
  try {
    url = new URL(databaseUrl);
  } catch {
    throw new Error("DATABASE_URL must be a valid PostgreSQL URL");
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol))
    throw new Error("DATABASE_URL must use the PostgreSQL protocol");
  const schema = url.searchParams.get("schema") ?? "public";
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(schema))
    throw new Error(
      "DATABASE_URL schema must be a valid PostgreSQL identifier",
    );
  return schema;
}

function validateProductionDatabase(
  env: DatabaseTransportEnv,
  context: z.RefinementCtx,
) {
  let url: URL;
  try {
    url = new URL(env.DATABASE_URL);
  } catch {
    context.addIssue({
      code: "custom",
      path: ["DATABASE_URL"],
      message: "DATABASE_URL must be a valid PostgreSQL URL",
    });
    return;
  }
  if (!["postgres:", "postgresql:"].includes(url.protocol))
    context.addIssue({
      code: "custom",
      path: ["DATABASE_URL"],
      message: "DATABASE_URL must use the PostgreSQL protocol",
    });
  if (!env.DATABASE_ALLOW_PLAINTEXT_INTERNAL)
    context.addIssue({
      code: "custom",
      path: ["DATABASE_ALLOW_PLAINTEXT_INTERNAL"],
      message: "production plaintext database access requires explicit opt-in",
    });
  if (url.searchParams.get("sslmode") !== "disable")
    context.addIssue({
      code: "custom",
      path: ["DATABASE_URL"],
      message: "production DATABASE_URL must set sslmode=disable explicitly",
    });
  if (url.searchParams.get("schema") !== "orosaga")
    context.addIssue({
      code: "custom",
      path: ["DATABASE_URL"],
      message: "production DATABASE_URL must select the orosaga schema",
    });
  if (!url.hostname.endsWith(".pg.rds.aliyuncs.com"))
    context.addIssue({
      code: "custom",
      path: ["DATABASE_URL"],
      message: "production DATABASE_URL must use an Alibaba Cloud RDS hostname",
    });
}

export const serverEnvSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    PORT: z.coerce.number().int().positive().default(3000),
    HOST: z.string().min(1).default("0.0.0.0"),
    DATABASE_URL: z.string().min(1),
    DATABASE_ALLOW_PLAINTEXT_INTERNAL: booleanFromString,
    PUBLIC_ORIGIN: z.string().url(),
    SESSION_SECRET: z.string().min(32),
    FEISHU_APP_ID: z.string().min(1),
    FEISHU_APP_SECRET: z.string().min(1),
    FEISHU_REDIRECT_URI: z.string().url(),
    FEISHU_API_BASE_URL: z.string().url().default("https://open.feishu.cn"),
    OSS_REGION: z.string().optional(),
    OSS_ENDPOINT: z.string().trim().min(1).optional(),
    OSS_BUCKET: z.string().optional(),
    OSS_ACCESS_KEY_ID: z.string().optional(),
    OSS_ACCESS_KEY_SECRET: z.string().optional(),
    OSS_STS_TOKEN: z.string().optional(),
    PRIVATE_ASSET_ROOT: z.string().optional(),
    SYSTEM_LINK_ALLOWED_HOSTS: z.string().default(""),
    FEISHU_WIKI_HOST: z.string().default("wanhuxian.feishu.cn"),
    WEATHER_API_URL: z.string().url().optional(),
    AUTH_DEV_BYPASS: booleanFromString,
    SYNC_INTERVAL_MINUTES: z.coerce.number().int().positive().default(30),
  })
  .superRefine((env, context) => {
    if (env.NODE_ENV !== "production") return;
    validateProductionDatabase(env, context);
    for (const field of [
      "DATABASE_URL",
      "SESSION_SECRET",
      "FEISHU_APP_ID",
      "FEISHU_APP_SECRET",
      "OSS_REGION",
      "OSS_ENDPOINT",
      "OSS_BUCKET",
      "OSS_ACCESS_KEY_ID",
      "OSS_ACCESS_KEY_SECRET",
    ] as const)
      rejectPlaceholder(context, field, env[field]);
    for (const field of [
      "OSS_REGION",
      "OSS_ENDPOINT",
      "OSS_BUCKET",
      "OSS_ACCESS_KEY_ID",
      "OSS_ACCESS_KEY_SECRET",
    ] as const) {
      if (!env[field])
        context.addIssue({
          code: "custom",
          path: [field],
          message: `${field} is required in production`,
        });
    }
    if (env.AUTH_DEV_BYPASS)
      context.addIssue({
        code: "custom",
        path: ["AUTH_DEV_BYPASS"],
        message: "AUTH_DEV_BYPASS must be false in production",
      });
    if (env.PRIVATE_ASSET_ROOT)
      context.addIssue({
        code: "custom",
        path: ["PRIVATE_ASSET_ROOT"],
        message: "PRIVATE_ASSET_ROOT is not allowed in production",
      });
  });

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function parseServerEnv(
  env: NodeJS.ProcessEnv = process.env,
): ServerEnv {
  return serverEnvSchema.parse(env);
}

export const workerEnvSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    DATABASE_URL: z.string().min(1),
    DATABASE_ALLOW_PLAINTEXT_INTERNAL: booleanFromString,
    FEISHU_APP_ID: z.string().min(1),
    FEISHU_APP_SECRET: z.string().min(1),
    FEISHU_API_BASE_URL: z.string().url().default("https://open.feishu.cn"),
    FEISHU_WIKI_HOST: z.string().default("wanhuxian.feishu.cn"),
    SYNC_INTERVAL_MINUTES: z.coerce.number().int().positive().default(30),
  })
  .superRefine((env, context) => {
    if (env.NODE_ENV !== "production") return;
    validateProductionDatabase(env, context);
    for (const field of [
      "DATABASE_URL",
      "FEISHU_APP_ID",
      "FEISHU_APP_SECRET",
    ] as const)
      rejectPlaceholder(context, field, env[field]);
  });

export function parseWorkerEnv(env: NodeJS.ProcessEnv = process.env) {
  return workerEnvSchema.parse(env);
}

export const webEnvSchema = z.object({
  VITE_API_BASE_URL: z.string().default(""),
});

export type WebEnv = z.infer<typeof webEnvSchema>;
