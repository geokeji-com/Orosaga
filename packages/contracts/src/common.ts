import { z } from "zod";

export const roleSchema = z.enum(["EMPLOYEE", "EDITOR", "ADMIN"]);
export type Role = z.infer<typeof roleSchema>;

export const permissionSchema = z.enum([
  "content:read",
  "content:write",
  "content:rollback",
  "organization:write-profile",
  "system-links:write",
  "users:write-role",
  "integrations:operate",
  "audit:read",
]);
export type Permission = z.infer<typeof permissionSchema>;

export const errorEnvelopeSchema = z.object({
  code: z.string(),
  message: z.string(),
  requestId: z.string(),
  fieldErrors: z.record(z.string(), z.array(z.string())).optional(),
});
export type ErrorEnvelope = z.infer<typeof errorEnvelopeSchema>;

export const cursorPageSchema = <T extends z.ZodType>(item: T) =>
  z.object({
    items: z.array(item),
    nextCursor: z.string().nullable(),
  });

export const versionedSchema = z.object({
  id: z.string().uuid(),
  version: z.number().int().positive(),
  updatedAt: z.string().datetime(),
});

export const iconKeySchema = z.enum([
  "building",
  "network",
  "boxes",
  "workflow",
  "graduation",
  "book",
  "database",
  "chart",
  "clipboard",
  "radar",
  "file",
  "route",
]);

export const themeKeySchema = z.enum([
  "mint",
  "blue",
  "rose",
  "ink",
  "amber",
  "violet",
  "green",
]);
