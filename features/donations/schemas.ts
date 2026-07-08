import { z } from "zod";

// ─── Donation History Create Schema ──────────────────────────────────────────

export const donationSchema = z.object({
  patientName: z.string().min(1, "Patient name is required"),
  hospitalName: z.string().min(1, "Hospital name is required"),
  donationDate: z.coerce.date({
    errorMap: () => ({ message: "Invalid donation date" }),
  }),
  notes: z.string().optional().nullable(),
});

export type DonationInput = z.infer<typeof donationSchema>;
