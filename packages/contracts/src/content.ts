import { z } from "zod";
import { iconKeySchema, themeKeySchema, versionedSchema } from "./common.js";

const textBlockSchema = z.object({
  type: z.literal("text"),
  heading: z.string().max(160).optional(),
  body: z.string().max(20_000),
});

const metricBlockSchema = z.object({
  type: z.literal("metrics"),
  items: z.array(z.object({ label: z.string(), value: z.string() })).max(12),
});

const cardBlockSchema = z.object({
  type: z.literal("cards"),
  items: z
    .array(
      z.object({
        title: z.string(),
        description: z.string(),
        href: z.string().optional(),
        iconKey: iconKeySchema.optional(),
        themeKey: themeKeySchema.optional(),
      }),
    )
    .max(24),
});

const faqBlockSchema = z.object({
  type: z.literal("faq"),
  items: z
    .array(z.object({ question: z.string(), answer: z.string() }))
    .max(30),
});

export const contentBlockSchema = z.discriminatedUnion("type", [
  textBlockSchema,
  metricBlockSchema,
  cardBlockSchema,
  faqBlockSchema,
]);

export const contentPayloadSchema = z.object({
  title: z.string().min(1).max(160),
  summary: z.string().max(1000),
  eyebrow: z.string().max(120).optional(),
  blocks: z.array(contentBlockSchema).max(100),
});
export type ContentPayload = z.infer<typeof contentPayloadSchema>;

export const contentPageSchema = versionedSchema.extend({
  slug: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  pageType: z.enum(["HOME", "COMPANY", "ARTICLE"]),
  content: contentPayloadSchema,
  permissions: z.array(z.string()),
});
export type ContentPage = z.infer<typeof contentPageSchema>;

export const saveContentPageSchema = z.object({
  expectedVersion: z.number().int().nonnegative(),
  changeSummary: z.string().min(1).max(300),
  content: contentPayloadSchema,
});
export type SaveContentPage = z.infer<typeof saveContentPageSchema>;

export const contentRevisionSchema = z.object({
  id: z.string().uuid(),
  version: z.number().int().positive(),
  content: contentPayloadSchema,
  changeSummary: z.string(),
  actorName: z.string(),
  createdAt: z.string().datetime(),
});

export const rollbackSchema = z.object({
  expectedVersion: z.number().int().positive(),
  targetVersion: z.number().int().positive(),
});
