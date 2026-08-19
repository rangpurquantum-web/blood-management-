import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// Donation Schema
// ─────────────────────────────────────────────────────────────────────────────

export const donationSchema = z.object({
  patientName: z
    .string()
    .trim()
    .min(1, "Patient name is required")
    .max(200, "Patient name is too long"),

  hospitalName: z
    .string()
    .trim()
    .min(1, "Hospital name is required")
    .max(200, "Hospital name is too long"),

  donationDate: z.coerce
    .date({
      required_error: "Donation date is required",
      invalid_type_error: "Invalid donation date",
    })
    .refine(
      (date) => date <= new Date(),
      {
        message: "Donation date cannot be in the future",
      },
    ),

  notes: z
    .string()
    .trim()
    .max(2000, "Notes are too long")
    .optional()
    .or(z.literal("")),
});

// ─────────────────────────────────────────────────────────────────────────────
// Type
// ─────────────────────────────────────────────────────────────────────────────

export type DonationInput = z.infer<typeof donationSchema>;