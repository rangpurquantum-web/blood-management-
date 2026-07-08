import { DonorProfile } from "@/features/donors/components/donor-profile";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default async function DonorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const donorId = Number(id);

  if (isNaN(donorId)) {
    return <div className="p-8 text-destructive">Invalid donor ID.</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <Link 
          href="/dashboard/donors" 
          className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-primary transition-colors mb-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Directory
        </Link>
        <h1 className="text-3xl font-bold tracking-tight">Donor Profile</h1>
      </div>

      <DonorProfile donorId={donorId} />
    </div>
  );
}
