import { z } from "zod";

// ─── Blood type enum ─────────────────────────────────────────────────────────

const bloodTypes = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;

// ─── Donor Create Schema ──────────────────────────────────────────────────────

export const donorSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  dob: z.coerce
    .date()
    .refine(
      (date) => {
        const ageDiffMs = Date.now() - date.getTime();
        const ageDate = new Date(ageDiffMs);
        const age = Math.abs(ageDate.getUTCFullYear() - 1970);
        return age >= 18;
      },
      { message: "Donor must be at least 18 years old" },
    )
    .optional()
    .nullable(),
  gender: z.string().min(1, "Gender is required"),
  bloodType: z.enum(bloodTypes, {
    errorMap: () => ({ message: "Invalid blood type" }),
  }),
  phone: z
    .array(
      z.object({
        number: z.string().regex(/^01\d{9}$/, "Must be a valid 11-digit Bangladeshi mobile number (01XXXXXXXXX)"),
        label: z.string().min(1, "Label is required"),
        isPrimary: z.boolean(),
      })
    )
    .min(1, "At least one phone number is required")
    .refine(
      (phones) => phones.filter((p) => p.isPrimary).length === 1,
      { message: "Exactly one phone number must be marked as primary" }
    ),
  email: z.string().email("Invalid email address"),
  address: z.string().min(1, "Address is required"),
  lastDonationDate: z.coerce.date().optional().nullable(),
});

// ─── Donor Update Schema (all fields optional) ───────────────────────────────

export const donorUpdateSchema = donorSchema.partial().extend({
  status: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
  notes: z.string().optional().nullable(),
});

// ─── Donor Import Schema (relaxed — used only for CSV/Excel bulk import) ────

export const importDonorSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  dob: z.coerce
    .date()
    .catch(new Date("2000-01-01")),
  gender: z
    .string()
    .optional()
    .transform((val) => (val && val.trim() ? val : "Not specified")),
  bloodType: z.enum(bloodTypes, {
    errorMap: () => ({ message: "Invalid blood type" }),
  }),
  phone: z
    .array(
      z.object({
        number: z.string().regex(/^01\d{9}$/, "Must be a valid 11-digit Bangladeshi mobile number (01XXXXXXXXX)"),
        label: z.string().min(1).default("Primary"),
        isPrimary: z.boolean().default(true),
      })
    )
    .min(1, "At least one phone number is required"),
  email: z
    .string()
    .email("Invalid email address")
    .optional()
    .or(z.literal(""))
    .transform((val) => val || undefined),
  address: z
    .string()
    .optional()
    .transform((val) => (val && val.trim() ? val : "Not specified")),
});

// ─── Manual Deferral Schema ────────────────────────────────────────────────────

export const donorEligibilitySchema = z.object({
  deferralReason: z.string().min(1, "Deferral reason is required"),
  deferredUntil: z.coerce.date().refine(
    (date) => date > new Date(),
    { message: "Deferral end date must be in the future" },
  ),
});

export type DonorInput = z.infer<typeof donorSchema>;
export type DonorUpdateInput = z.infer<typeof donorUpdateSchema>;
export type DonorEligibilityInput = z.infer<typeof donorEligibilitySchema>;
export type ImportDonorInput = z.infer<typeof importDonorSchema>;
