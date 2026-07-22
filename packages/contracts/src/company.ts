import { z } from "zod";
import { iconKeySchema } from "./common.js";

const companyHeadingSchema = z.object({
  kicker: z.string().min(1).max(120),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
});

const companyCardSchema = z.object({
  title: z.string().min(1).max(160),
  subtitle: z.string().max(160).optional(),
  description: z.string().max(2000),
  output: z.string().max(1000).optional(),
  value: z.string().max(160).optional(),
  meta: z.string().max(160).optional(),
  iconKey: iconKeySchema.optional(),
});

const companyFactSchema = z.object({
  label: z.string().min(1).max(80),
  value: z.string().min(1).max(500),
});

export const companyContentPayloadSchema = z.object({
  schemaVersion: z.literal(1),
  eyebrow: z.string().min(1).max(120),
  title: z.string().min(1).max(160),
  lead: z.string().min(1).max(1000),
  source: z.object({
    label: z.string().max(80),
    name: z.string().max(160),
    date: z.string().max(40),
  }),
  definition: z.object({
    label: z.string().max(80),
    title: z.string().max(500),
    description: z.string().max(1000),
  }),
  facts: z.array(companyFactSchema).min(1).max(12),
  whyGeo: z.object({
    heading: companyHeadingSchema,
    journey: z.array(companyCardSchema).min(1).max(6),
    definition: z.string().min(1).max(2000),
  }),
  solution: z.object({
    heading: companyHeadingSchema,
    layers: z.array(companyCardSchema).min(1).max(8),
    wheels: z.array(companyCardSchema).min(1).max(4),
    systems: z.array(companyCardSchema).min(1).max(16),
  }),
  delivery: z.object({
    heading: companyHeadingSchema,
    steps: z.array(companyCardSchema).min(1).max(12),
    metrics: z.array(companyCardSchema).min(1).max(8),
  }),
  customers: z.object({
    heading: companyHeadingSchema,
    fit: z.array(companyCardSchema).min(1).max(12),
    modes: z.array(companyCardSchema).min(1).max(8),
    note: z.string().min(1).max(2000),
  }),
  proof: z.object({
    heading: companyHeadingSchema,
    stats: z.array(companyFactSchema).min(1).max(12),
    cases: z.array(companyCardSchema).min(1).max(12),
    disclaimer: z.string().min(1).max(2000),
    boundaries: z.array(companyCardSchema).min(1).max(4),
    milestones: z.array(companyFactSchema).min(1).max(12),
  }),
  remember: z.object({
    heading: companyHeadingSchema,
    facts: z.array(z.string().min(1).max(1000)).min(1).max(12),
  }),
  faq: z.object({
    heading: companyHeadingSchema,
    items: z
      .array(
        z.object({
          question: z.string().min(1).max(300),
          answer: z.string().min(1).max(3000),
        }),
      )
      .min(1)
      .max(30),
  }),
});

export type CompanyContentPayload = z.infer<typeof companyContentPayloadSchema>;
