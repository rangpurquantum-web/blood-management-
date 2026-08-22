import type { BirthdayDonor } from "@/features/donors/components/birthday-list";

// ─────────────────────────────────────────────
// "Today" is defined in Asia/Dhaka time, not
// server/UTC time, so this stays correct near
// midnight regardless of where Vercel runs the
// function.
// ─────────────────────────────────────────────

export function getDhakaMonthDay(): { month: number; day: number; year: number } {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = formatter.formatToParts(new Date());

  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);
  const year = Number(parts.find((p) => p.type === "year")?.value);

  return { month, day, year };
}

// ─────────────────────────────────────────────
// Given a branch's Prisma client, find approved,
// non-deleted donors whose dob's month/day match
// today (Asia/Dhaka).
//
// dob is stored as a plain date (from a <input
// type="date">), so it's parsed as UTC midnight —
// we read its UTC month/day, which matches the
// date as originally entered regardless of the
// server's local timezone.
// ─────────────────────────────────────────────

export async function getTodaysBirthdays(
  branchDb: {
    donor: {
      findMany: (args: any) => Promise<any[]>;
    };
  },
): Promise<BirthdayDonor[]> {
  const { month: todayMonth, day: todayDay, year: todayYear } = getDhakaMonthDay();

  const donorsWithDob = await branchDb.donor.findMany({
    where: {
      isDeleted: false,
      status: "APPROVED",
      dob: { not: null },
    },
    select: {
      id: true,
      fullName: true,
      bloodType: true,
      dob: true,
      phone: {
        select: {
          id: true,
          number: true,
          label: true,
          isPrimary: true,
        },
      },
    },
  });

  const todaysBirthdays: BirthdayDonor[] = [];

  for (const donor of donorsWithDob) {
    if (!donor.dob) continue;

    const dob = new Date(donor.dob);

    const dobMonth = dob.getUTCMonth() + 1;
    const dobDay = dob.getUTCDate();

    if (dobMonth === todayMonth && dobDay === todayDay) {
      todaysBirthdays.push({
        id: donor.id,
        fullName: donor.fullName,
        bloodType: donor.bloodType,
        dob: dob.toISOString(),
        turningAge: todayYear - dob.getUTCFullYear(),
        phone: donor.phone ?? [],
      });
    }
  }

  return todaysBirthdays;
}
