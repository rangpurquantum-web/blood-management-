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
    select: {
      fullName: true,
      bloodType: true,
      dob: true,
      publicToken: true,
      isEligible: true,
    },
  });

  if (!donor) {
    notFound();
  }

  let dobText = "Not available";

  if (donor.dob) {
    const dob = new Date(donor.dob);

    const day = String(dob.getDate()).padStart(2, "0");
    const month = String(
      dob.getMonth() + 1
    ).padStart(2, "0");
    const year = dob.getFullYear();

    dobText = `${day}/${month}/${year}`;
  }

  return (
    <main className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="overflow-hidden rounded-2xl border bg-white shadow-xl">
          {/* Header */}
          <div className="bg-emerald-800 px-6 py-7 text-center text-white">
            <h1 className="text-lg font-bold tracking-wide">
              QUANTUM VOLUNTARY
            </h1>

            <h2 className="text-lg font-bold tracking-wide">
              BLOOD DONATION PROGRAMME
            </h2>

            <p className="mt-2 text-xs text-emerald-100">
              DONOR VERIFICATION
            </p>
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
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Donor Name
                </p>

                <p className="mt-1 text-xl font-bold text-slate-900">
                  {donor.fullName}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Blood Group
                </p>

                <p className="mt-1 text-lg font-bold text-red-600">
                  {donor.bloodType}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Date of Birth
                </p>

                <p className="mt-1 text-base font-medium text-slate-900">
                  {dobText}
                </p>
              </div>
            </div>

            {/* Verification */}
            <div className="mt-7 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
              <p className="text-sm font-bold text-emerald-800">
                VERIFIED DONOR
              </p>

              <p className="mt-1 text-xs text-emerald-700">
                This donor record is verified by Quantum Voluntary Blood
                Donation Programme.
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t bg-slate-50 px-6 py-4 text-center">
            <p className="text-xs text-slate-500">
              Donor ID: {donor.publicToken}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}