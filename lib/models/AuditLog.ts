import { Schema, models, model } from "mongoose";

export interface IAuditLog {
  userId: number | null;
  userName: string | null;
  userEmail: string | null;
  action: string;
  details: string;
  timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLog>({
  userId: { type: Number, default: null },
  userName: { type: String, default: null },
  userEmail: { type: String, default: null },
  action: { type: String, required: true },
  details: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

AuditLogSchema.index({ userId: 1 });
AuditLogSchema.index({ timestamp: -1 });

// `models.AuditLog ||` avoids "OverwriteModelError" during Next.js dev hot reloads
export const AuditLog = models.AuditLog || model<IAuditLog>("AuditLog", AuditLogSchema);
