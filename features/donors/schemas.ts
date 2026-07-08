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
    ),
  gender: z.string().min(1, "Gender is required"),
  bloodType: z.enum(bloodTypes, {
    errorMap: () => ({ message: "Invalid blood type" }),
  }),
  phone: z
    .string()
    .min(7, "Phone number is too short")
    .max(20, "Phone number is too long"),
  email: z.string().email("Invalid email address"),
  address: z.string().min(1, "Address is required"),
});

// ─── Donor Update Schema (all fields optional) ───────────────────────────────

export const donorUpdateSchema = donorSchema.partial();

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
