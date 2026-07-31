"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { useDeleteDonor } from "@/features/donors/hooks";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function DeleteDonorDialog({
  donorId,
  donorName,
  onSuccess,
  trigger,
}: {
  donorId: number;
  donorName?: string;
  onSuccess?: () => void;
  trigger?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const deleteDonor = useDeleteDonor();

  const handleDelete = () => {
    deleteDonor.mutate(donorId, {
      onSuccess: () => {
        toast.success("ডোনার সফলভাবে মুছে ফেলা হয়েছে");
        setOpen(false);
        onSuccess?.();
        router.push("/dashboard/donors");
      },
      onError: (err: any) => {
        toast.error(err.error || "ডোনার মুছতে ব্যর্থ হয়েছে");
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="destructive">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Donor
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center gap-2 text-destructive mb-1">
            <AlertTriangle className="h-5 w-5" />
            <DialogTitle className="text-lg">আপনি কি নিশ্চিত এই ডোনারকে মুছে ফেলতে চান?</DialogTitle>
          </div>
          <DialogDescription className="pt-2 text-sm text-muted-foreground">
            {donorName ? (
              <>
                <span className="font-semibold text-foreground">{donorName}</span>-এর রেকর্ডটি সফট-ডিলিট করা হবে। এটি আর ডোনার ডিরেক্টরি বা সাধারণ অনুসন্ধানে দেখা যাবে না।
              </>
            ) : (
              "এই ডোনারের রেকর্ডটি সফট-ডিলিট করা হবে। এটি আর সাধারণ ডিরেক্টরি বা অনুসন্ধানে দেখা যাবে না।"
            )}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-3 pt-4 border-t mt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={deleteDonor.isPending}
          >
            বাতিল
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={deleteDonor.isPending}
          >
            {deleteDonor.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            মুছে ফেলুন
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
