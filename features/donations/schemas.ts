import { z } from "zod";

// ─── Donation Schema ──────────────────────────────────────────────────────────

export const donationSchema = z.object({
  patientName: z
    .string()
    .trim()
    .min(1, "Patient name is required"),

  hospitalName: z
    .string()
    .trim()
    .min(1, "Hospital name is required"),

  // HTML <input type="date"> returns YYYY-MM-DD
  donationDate: z
    .string()
    .min(1, "Donation date is required")
    .refine(
      (value) => {
        const date = new Date(`${value}T00:00:00`);

        return !Number.isNaN(date.getTime());
      },
      {
        message: "Invalid donation date",
      },
    )
    .refine(
      (value) => {
        const selectedDate = new Date(`${value}T00:00:00`);

        const today = new Date();

        today.setHours(23, 59, 59, 999);

        return selectedDate <= today;
      },
      {
        message: "Donation date cannot be in the future",
      },
    ),

  notes: z
    .string()
    .trim()
    .optional()
    .default(""),
});

// ─── Type ─────────────────────────────────────────────────────────────────────

export type DonationInput = z.infer<typeof donationSchema>;