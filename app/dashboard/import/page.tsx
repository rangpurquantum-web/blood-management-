import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Role } from "@prisma/client";
import { FileUploader } from "@/features/import-export/components/file-uploader";

export default async function ImportPage() {
  const session = await auth();

  if (session?.user?.role !== Role.ADMIN) {
    redirect("/dashboard");
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Bulk Import</h1>
        <p className="text-muted-foreground">
          Import multiple donor records into the system at once using a CSV file.
        </p>
      </div>

      <FileUploader />
    </div>
  );
}
