import { z } from "zod";

const bloodTypes = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
const statuses = ["Pending", "Fulfilled", "Cancelled"] as const;

// ─── Blood Request Create Schema ──────────────────────────────────────────────

export const bloodRequestSchema = z.object({
  patientName: z.string().min(1, "Patient name is required"),
  bloodGroup: z.enum(bloodTypes, {
    errorMap: () => ({ message: "Invalid blood group" }),
  }),
  requiredUnits: z
    .number()
    .int("Must be a whole number")
    .min(1, "At least 1 unit is required"),
  requiredDate: z.coerce.date({
    errorMap: () => ({ message: "Invalid required date" }),
  }),
  contactPerson: z.string().min(1, "Contact person is required"),
  contactNumber: z
    .string()
    .min(7, "Contact number is too short")
    .max(20, "Contact number is too long"),
  notes: z.string().optional().nullable(),
  status: z.enum(statuses).optional().default("Pending"),
});

// ─── Blood Request Update Schema (for status changes or full edits) ───────────

export const bloodRequestUpdateSchema = bloodRequestSchema.partial();

export type BloodRequestInput = z.infer<typeof bloodRequestSchema>;
export type BloodRequestUpdateInput = z.infer<typeof bloodRequestUpdateSchema>;
