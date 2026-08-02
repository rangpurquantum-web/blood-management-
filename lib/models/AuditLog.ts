import { Schema, models, model, Model } from "mongoose";

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

// Explicit `Model<IAuditLog>` type avoids a TypeScript "not callable" error —
// without it, `models.AuditLog || model(...)` resolves to an ambiguous union
// type that TypeScript can't call methods like .find() on reliably.
export const AuditLog: Model<IAuditLog> =
  (models.AuditLog as Model<IAuditLog>) || model<IAuditLog>("AuditLog", AuditLogSchema);
