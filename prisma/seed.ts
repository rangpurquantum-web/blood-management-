import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ─── Users ────────────────────────────────────────────────────────────────
  const adminHash = await bcrypt.hash("Qblood@2026", 10);
  const staffHash = await bcrypt.hash("StaffPassword@2026!", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@qblood.org" },
    update: {},
    create: {
      email: "admin@qblood.org",
      passwordHash: adminHash,
      role: "ADMIN",
      name: "System Administrator",
    },
  });

  const staff = await prisma.user.upsert({
    where: { email: "staff@qblood.org" },
    update: {},
    create: {
      email: "staff@qblood.org",
      passwordHash: staffHash,
      role: "VOLUNTEER",
      name: "Jane Cooper",
    },
  });

  console.log(`✅ Users created: ${admin.email}, ${staff.email}`);

  // ─── Donors ────────────────────────────────────────────────────────────────
  const donorSeedData = [
    {
      fullName: "Marcus Brody",
      dob: new Date("1988-04-14"),
      gender: "Male",
      bloodType: "A+",
      phone: "+8801711111101",
      email: "marcus.brody@example.com",
      address: "12 Elm Street, Dhaka",
      isEligible: true,
    },
    {
      fullName: "Sarah Connor",
      dob: new Date("1994-11-23"),
      gender: "Female",
      bloodType: "O-",
      phone: "+8801711111102",
      email: "sarah.connor@example.com",
      address: "742 Evergreen Terrace, Chittagong",
      isEligible: true,
    },
    {
      fullName: "Bruce Banner",
      dob: new Date("1975-12-18"),
      gender: "Male",
      bloodType: "B+",
      phone: "+8801711111103",
      email: "bruce.banner@example.com",
      address: "4 Science Ave, Sylhet",
      isEligible: false,
      deferralReason: "Recent donation",
      deferredUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
    {
      fullName: "Diana Prince",
      dob: new Date("1990-03-22"),
      gender: "Female",
      bloodType: "AB+",
      phone: "+8801711111104",
      email: "diana.prince@example.com",
      address: "Paradise Island Road, Rajshahi",
      isEligible: true,
    },
    {
      fullName: "Tony Stark",
      dob: new Date("1970-05-29"),
      gender: "Male",
      bloodType: "A-",
      phone: "+8801711111105",
      email: "tony.stark@example.com",
      address: "Stark Tower, Khulna",
      isEligible: true,
    },
    {
      fullName: "Natasha Romanoff",
      dob: new Date("1984-11-22"),
      gender: "Female",
      bloodType: "O+",
      phone: "+8801711111106",
      email: "natasha.romanoff@example.com",
      address: "Black Widow Ln, Barisal",
      isEligible: false,
      deferralReason: "Medical deferral — physician review",
      deferredUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },
    {
      fullName: "Peter Parker",
      dob: new Date("2000-08-10"),
      gender: "Male",
      bloodType: "B-",
      phone: "+8801711111107",
      email: "peter.parker@example.com",
      address: "Queens, Mymensingh",
      isEligible: true,
    },
    {
      fullName: "Carol Danvers",
      dob: new Date("1986-03-04"),
      gender: "Female",
      bloodType: "AB-",
      phone: "+8801711111108",
      email: "carol.danvers@example.com",
      address: "Kree Base, Comilla",
      isEligible: true,
    },
    {
      fullName: "Steve Rogers",
      dob: new Date("1980-07-04"),
      gender: "Male",
      bloodType: "O+",
      phone: "+8801711111109",
      email: "steve.rogers@example.com",
      address: "Brooklyn Heights, Narayanganj",
      isEligible: true,
    },
    {
      fullName: "Wanda Maximoff",
      dob: new Date("1992-02-10"),
      gender: "Female",
      bloodType: "A+",
      phone: "+8801711111110",
      email: "wanda.maximoff@example.com",
      address: "Westview, Gazipur",
      isEligible: true,
    },
  ];

  const donors: Awaited<ReturnType<typeof prisma.donor.create>>[] = [];

  for (const d of donorSeedData) {
    const { phone, ...rest } = d;
    const donor = await prisma.donor.upsert({
      where: { email: d.email },
      update: {},
      create: {
        ...rest,
        phone: {
          create: [
            {
              number: phone,
              label: "Primary",
              isPrimary: true,
            },
          ],
        },
      },
    });
    donors.push(donor);
  }

  console.log(`✅ ${donors.length} donors seeded`);

  // ─── Donation History ──────────────────────────────────────────────────────
  const donationSeeds = [
    {
      donorId: donors[0]!.id, // Marcus — A+
      patientName: "Arthur Dent",
      hospitalName: "Dhaka Medical College Hospital",
      donationDate: new Date("2026-01-15T09:00:00Z"),
      notes: "Routine voluntary donation",
    },
    {
      donorId: donors[2]!.id, // Bruce — B+ (already deferred)
      patientName: "Clark Kent",
      hospitalName: "Square Hospital, Dhaka",
      donationDate: new Date("2026-05-03T10:00:00Z"),
      notes: "Post-surgery support",
    },
    {
      donorId: donors[4]!.id, // Tony — A-
      patientName: "Pepper Potts",
      hospitalName: "Lab Aid Hospital",
      donationDate: new Date("2026-03-22T08:30:00Z"),
      notes: null,
    },
    {
      donorId: donors[5]!.id, // Natasha — O+ (already deferred)
      patientName: "Maria Hill",
      hospitalName: "United Hospital, Dhaka",
      donationDate: new Date("2026-05-14T11:00:00Z"),
      notes: "Emergency request",
    },
    {
      donorId: donors[8]!.id, // Steve — O+
      patientName: "Bucky Barnes",
      hospitalName: "Bangladesh Specialized Hospital",
      donationDate: new Date("2026-02-20T09:00:00Z"),
      notes: "Long-standing volunteer",
    },
  ];

  for (const donation of donationSeeds) {
    await prisma.donationHistory.create({ data: donation });
  }

  console.log(`✅ ${donationSeeds.length} donation records seeded`);



  // ─── Audit Logs ────────────────────────────────────────────────────────────
  await prisma.auditLog.createMany({
    data: [
      {
        userId: admin.id,
        action: "User Login",
        details: "Admin user logged in for the first time",
      },
      {
        userId: admin.id,
        action: "Donor Created",
        details: "Registered donor: Marcus Brody (A+)",
      },
      {
        userId: staff.id,
        action: "Donation Recorded",
        details: "Logged donation for Marcus Brody → patient Arthur Dent",
      }
    ],
  });

  console.log("✅ Audit log entries seeded");
  console.log("\n🎉 Database seeding complete!");
  console.log("   Admin:  admin@qblood.org / Qblood@2026");
  console.log("   Staff:  staff@qblood.org / StaffPassword@2026!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
