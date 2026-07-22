import { z } from "zod";

const booleanFromString = z
  .enum(["true", "false"])
  .default("false")
  .transform((value) => value === "true");

export const serverEnvSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
    PORT: z.coerce.number().int().positive().default(3000),
    HOST: z.string().min(1).default("0.0.0.0"),
    DATABASE_URL: z.string().min(1),
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

export const webEnvSchema = z.object({
  VITE_API_BASE_URL: z.string().default(""),
});

export type WebEnv = z.infer<typeof webEnvSchema>;
