{
    name: "remove_blood_request",
    statements: [`DROP TABLE "BloodRequest"`],
  },
  {
    name: "add_donor_public_token",
    statements: [
      `ALTER TABLE "Donor" ADD COLUMN "publicToken" TEXT NOT NULL DEFAULT gen_random_uuid()::text`,
      `CREATE UNIQUE INDEX "Donor_publicToken_key" ON "Donor"("publicToken")`,
      `CREATE INDEX "Donor_publicToken_idx" ON "Donor"("publicToken")`,
    ],
  },
];