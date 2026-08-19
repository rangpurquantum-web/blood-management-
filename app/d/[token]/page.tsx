import { prisma } from "@/lib/db";
import { notFound } from "next/navigation";

type PageProps = {
  params: Promise<{
    token: string;
  }>;
};

export default async function PublicDonorPage({
  params,
}: PageProps) {
  const { token } = await params;

  if (!token) {
    notFound();
  }

  const donor = await prisma.donor.findFirst({
    where: {
      publicToken: token,
      isDeleted: false,
      status: "APPROVED",
    },

    include: {
      donations: {
        orderBy: {
          donationDate: "desc",
        },
        take: 1,
      },
    },
  });

  if (!donor) {
    notFound();
  }

  // --------------------------------------------------
  // Date formatter
  // --------------------------------------------------

  const formatDate = (
    date: Date | null | undefined
  ) => {
    if (!date) {
      return "Not available";
    }

    const d = new Date(date);

    const day = String(
      d.getDate()
    ).padStart(2, "0");

    const month = String(
      d.getMonth() + 1
    ).padStart(2, "0");

    const year =
      d.getFullYear();

    return `${day}/${month}/${year}`;
  };

  const dobText = formatDate(
    donor.dob
  );

  const lastDonation =
    donor.donations[0]?.donationDate
      ? formatDate(
          donor.donations[0]
            .donationDate
        )
      : "No donation record";

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Card */}

        <div className="overflow-hidden rounded-2xl border bg-white shadow-xl">

          {/* Header */}

          <div className="bg-red-700 px-6 py-7 text-center text-white">

            <h1 className="text-base font-bold tracking-wide">
              QUANTUM VOLENTARY
            </h1>

            <h2 className="text-base font-bold tracking-wide">
              BLOOD DONATION PROGRAMME
            </h2>

          </div>

          {/* Blood Group */}

          <div className="flex justify-center pt-7">

            <div className="flex h-36 w-36 items-center justify-center rounded-full border-4 border-red-600 bg-red-50">

              <span className="text-5xl font-black text-red-600">
                {donor.bloodType}
              </span>

            </div>

          </div>

          {/* Information */}

          <div className="px-6 py-7">

            <div className="space-y-5">

              {/* Name */}

              <div>

                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Donor Name
                </p>

                <p className="mt-1 text-xl font-bold text-slate-900">
                  {donor.fullName}
                </p>

              </div>

              {/* Blood Group */}

              <div>

                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Blood Group
                </p>

                <p className="mt-1 text-lg font-bold text-red-600">
                  {donor.bloodType}
                </p>

              </div>

              {/* DOB */}

              <div>

                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Date of Birth
                </p>

                <p className="mt-1 text-base font-medium text-slate-900">
                  {dobText}
                </p>

              </div>

              {/* Last Donation */}

              <div>

                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Last Donation
                </p>

                <p className="mt-1 text-base font-bold text-red-600">
                  {lastDonation}
                </p>

              </div>

            </div>

            {/* Verification */}

            <div className="mt-7 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">

              <p className="text-sm font-bold text-emerald-800">
                VERIFIED DONOR
              </p>

              <p className="mt-1 text-xs text-emerald-700">
                This donor record is verified by
                Quantum Voluntary Blood
                Donation Programme.
              </p>

            </div>

          </div>

          {/* Footer */}

          <div className="border-t bg-slate-50 px-6 py-4 text-center">

            <p className="text-xs text-slate-500 break-all">
              Donor ID: {donor.publicToken}
            </p>

          </div>

        </div>

      </div>
    </main>
  );
}