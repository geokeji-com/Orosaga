import { z } from "zod";
import { roleSchema } from "./common.js";

export const departmentSchema = z.object({
  id: z.string().uuid(),
  externalDepartmentId: z.string(),
  name: z.string(),
  parentId: z.string().uuid().nullable(),
  active: z.boolean(),
});
export type Department = z.infer<typeof departmentSchema>;

export const employeeSchema = z.object({
  id: z.string().uuid(),
  displayName: z.string(),
  role: roleSchema,
  title: z.string(),
  departmentId: z.string().uuid().nullable(),
  departmentName: z.string().nullable(),
  active: z.boolean(),
  avatarUrl: z.string().nullable(),
  bio: z.string(),
  learn: z.string(),
  tags: z.array(z.string()),
  profileVersion: z.number().int().nonnegative(),
});
export type Employee = z.infer<typeof employeeSchema>;

export const updateEmployeeProfileSchema = z.object({
  expectedVersion: z.number().int().nonnegative(),
  bio: z.string().max(2000),
  learn: z.string().max(1000),
  tags: z.array(z.string().min(1).max(30)).max(12),
});

export const organizationQuerySchema = z.object({
  q: z.string().max(100).optional(),
  department: z.string().uuid().optional(),
  cursor: z.string().optional(),
});
