import { z } from "zod";
import { permissionSchema, roleSchema } from "./common.js";

export const sessionUserSchema = z.object({
  id: z.string().uuid(),
  feishuOpenId: z.string(),
  displayName: z.string(),
  role: roleSchema,
  status: z.enum(["ACTIVE", "INACTIVE"]),
  permissions: z.array(permissionSchema),
  csrfToken: z.string(),
});
export type SessionUser = z.infer<typeof sessionUserSchema>;

export const updateRoleSchema = z.object({ role: roleSchema });
