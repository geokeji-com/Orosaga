import { z } from "zod";
import { iconKeySchema, roleSchema, themeKeySchema } from "./common.js";

export const navigationItemSchema = z.object({
  id: z.string().uuid(),
  label: z.string(),
  description: z.string(),
  href: z.string(),
  iconKey: iconKeySchema,
  themeKey: themeKeySchema,
  position: z.number().int(),
});

export const workflowStageSchema = z.object({
  id: z.string().uuid(),
  key: z.string(),
  title: z.string(),
  shortTitle: z.string(),
  summary: z.string(),
  owner: z.string(),
  system: z.string(),
  iconKey: iconKeySchema,
  inputs: z.array(z.string()),
  actions: z.array(z.string()),
  done: z.array(z.string()),
  outputs: z.array(z.string()),
  next: z.string(),
  position: z.number().int(),
});

export const workflowSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  title: z.string(),
  version: z.number().int().positive(),
  stages: z.array(workflowStageSchema),
});

export const systemLinkSchema = z.object({
  id: z.string().uuid(),
  group: z.string(),
  name: z.string(),
  description: z.string(),
  href: z.string().url(),
  iconKey: iconKeySchema,
  environment: z.enum(["INTERNAL", "PRODUCTION", "STAGING"]),
  minimumRole: roleSchema,
  enabled: z.boolean(),
  version: z.number().int().positive(),
});

export const campSchema = z.object({
  id: z.string().uuid(),
  displayCode: z.string(),
  title: z.string(),
  href: z.string().url(),
  legacyDescendantCount: z.number().int().nonnegative(),
  documentCount: z.number().int().nonnegative(),
  syncedAt: z.string().datetime(),
});
export type Camp = z.infer<typeof campSchema>;

export const knowledgeSourceSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  spaceId: z.string(),
  rootNodeToken: z.string(),
  excludedTokens: z.array(z.string()),
  intervalMins: z.number().int().min(5).max(1440),
  enabled: z.boolean(),
  version: z.number().int().positive(),
  lastSuccessAt: z.string().datetime().nullable(),
});
export type KnowledgeSource = z.infer<typeof knowledgeSourceSchema>;

export const createKnowledgeSourceSchema = knowledgeSourceSchema
  .pick({
    name: true,
    spaceId: true,
    rootNodeToken: true,
    excludedTokens: true,
    intervalMins: true,
    enabled: true,
  })
  .extend({ name: z.string().min(1).max(100) });

export const saveKnowledgeSourceSchema = createKnowledgeSourceSchema.extend({
  expectedVersion: z.number().int().positive(),
});

export const searchResultSchema = z.object({
  id: z.string(),
  type: z.enum(["PAGE", "EMPLOYEE", "WORKFLOW", "SYSTEM", "CAMP", "WIKI_NODE"]),
  title: z.string(),
  description: z.string(),
  href: z.string(),
});

export const saveWorkflowSchema = z.object({
  expectedVersion: z.number().int().positive(),
  title: z.string().min(1),
  stages: z
    .array(workflowStageSchema.omit({ id: true }))
    .min(1)
    .max(20),
});

export const saveSystemLinkSchema = z.object({
  expectedVersion: z.number().int().positive(),
  group: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  href: z.string().url(),
  iconKey: iconKeySchema,
  environment: z.enum(["INTERNAL", "PRODUCTION", "STAGING"]),
  minimumRole: roleSchema,
  enabled: z.boolean(),
});

export const syncRunSchema = z.object({
  id: z.string().uuid(),
  source: z.enum(["ORGANIZATION", "WIKI"]),
  status: z.enum(["RUNNING", "SUCCEEDED", "FAILED"]),
  discovered: z.number().int(),
  created: z.number().int(),
  updated: z.number().int(),
  deleted: z.number().int(),
  skipped: z.number().int(),
  errorCode: z.string().nullable(),
  errorMessage: z.string().nullable(),
  startedAt: z.string().datetime(),
  finishedAt: z.string().datetime().nullable(),
});

export const auditEntrySchema = z.object({
  id: z.string().uuid(),
  actorName: z.string(),
  action: z.string(),
  resourceType: z.string(),
  resourceId: z.string(),
  requestId: z.string(),
  createdAt: z.string().datetime(),
});
