import { z } from "zod";

// ─── Audit Log Schema (for internal usage / type inference) ──────────────────

export const auditLogSchema = z.object({
  userId: z.number().int().optional().nullable(),
  action: z.string().min(1, "Action is required"),
  details: z.string().min(1, "Details are required"),
});

export type AuditLogInput = z.infer<typeof auditLogSchema>;
