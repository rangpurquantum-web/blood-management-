"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useDonor, useUpdateDonor } from "@/features/donors/hooks";
import { format } from "date-fns";
import { hasPermission } from "@/lib/permissions";

import {
  MapPin,
  Phone,
  Mail,
  User2,
  Droplet,
  AlertTriangle,
  Edit,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
  Save,
  Download,
  MoreVertical,
  ShieldAlert,
  Trash2,
  BadgeCheck,
} from "lucide-react";

import { toast } from "sonner";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { DonationForm } from "@/features/donations/components/donation-form";
import { DonationTimeline } from "@/features/donations/components/donation-timeline";
import { useRecordDonation } from "@/features/donations/hooks";

import { DeferralForm } from "@/features/donors/components/deferral-form";
import { DonorForm } from "@/features/donors/components/donor-form";
import { DeleteDonorDialog } from "@/features/donors/components/delete-donor-dialog";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getWhatsAppUrl(number: string) {
  const cleanNumber = number.replace(/\D/g, "");

  if (cleanNumber.startsWith("880")) {
    return `https://wa.me/${cleanNumber}`;
  }

  if (cleanNumber.startsWith("0")) {
    return `https://wa.me/880${cleanNumber.substring(1)}`;
  }

  if (cleanNumber.startsWith("1")) {
    return `https://wa.me/880${cleanNumber}`;
  }

  return `https://wa.me/${cleanNumber}`;
}

function getLocalToday() {
  const today = new Date();

  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// ─── WhatsApp Icon ────────────────────────────────────────────────────────────

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="currentColor"
    className={className}
  >
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.504-5.711-1.465L0 24zm6.59-4.846c1.6.95 3.498 1.453 5.418 1.454 5.918 0 10.732-4.814 10.735-10.736.001-2.868-1.115-5.566-3.144-7.596C17.628 2.247 14.927 1.13 12.05 1.13c-5.923 0-10.74 4.817-10.743 10.74 0 1.954.51 3.86 1.478 5.564L1.758 21.32l4.89-1.282c1.611.879 3.42 1.34 5.253 1.342zm11.754-8.012c-.322-.16-.1.9-.3.948s-.58.12-.9.08a4.8 4.8 0 0 1-2.48-1.56 5.3 5.3 0 0 1-1.26-1.92c-.22-.38.02-.58.18-.74.16-.16.32-.32.48-.48a1.1 1.1 0 0 0 .16-.48c.04-.32-.08-.6-.16-.76-.08-.16-.72-1.72-.98-2.36-.26-.62-.52-.54-.72-.54h-.62c-.2 0-.52.08-.8.38a3.1 3.1 0 0 0-1 2.3c0 1.46.74 2.8 1 3.2.1.18 2.92 4.46 7.08 6.26 1 .44 1.76.7 2.36.9.98.32 1.88.28 2.58.18.78-.12 2.4-.98 2.74-1.92.34-.94.34-1.76.24-1.92-.1-.16-.38-.26-.7-.42z" />
  </svg>
);

// ─── Component ────────────────────────────────────────────────────────────────

export function DonorProfile({ donorId }: { donorId: number }) {
  const { data: session } = useSession();

  // ─────────────────────────────────────────────────────────────────────────
  // Permissions
  // ─────────────────────────────────────────────────────────────────────────

  const canEdit = hasPermission(session?.user, "donorEdit");
  const canDelete = hasPermission(session?.user, "donorDelete");
  const canApprove = hasPermission(session?.user, "approveReject");
  const canEditNotes = hasPermission(session?.user, "notesEdit");
  const canView = hasPermission(session?.user, "donorView");

  // ─────────────────────────────────────────────────────────────────────────
  // Data
  // ─────────────────────────────────────────────────────────────────────────

  const {
    data: donor,
    isLoading,
    isError,
  } = useDonor(donorId);

  const recordDonation = useRecordDonation(donorId);
  const updateDonor = useUpdateDonor(donorId);

  // ─────────────────────────────────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────────────────────────────────

  const [copiedNumber, setCopiedNumber] = useState<string | null>(null);
  const [showAllPhones, setShowAllPhones] = useState(false);

  const [notes, setNotes] = useState("");
  const [isEditingNotes, setIsEditingNotes] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────
  // Sync notes
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (donor) {
      setNotes((donor as any).notes || "");
    }
  }, [donor]);

  // ─────────────────────────────────────────────────────────────────────────
  // Download ID card
  // ─────────────────────────────────────────────────────────────────────────

  const handleDownloadIdCard = () => {
    if (!donor) return;

    window.open(
      `/api/donors/${donor.id}/card`,
      "_blank",
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Save notes
  // ─────────────────────────────────────────────────────────────────────────

  const handleSaveNotes = () => {
    updateDonor.mutate(
      {
        notes,
      },
      {
        onSuccess: () => {
          toast.success("Notes saved successfully");
          setIsEditingNotes(false);
        },

        onError: (err: any) => {
          toast.error(
            err?.message ||
              err?.error ||
              "Failed to save notes",
          );
        },
      },
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Donated Today
  // ─────────────────────────────────────────────────────────────────────────

  const handleDonatedToday = () => {
    if (
      !window.confirm(
        "This will record a donation with today's date. Continue?",
      )
    ) {
      return;
    }

    // IMPORTANT:
    // Use local date instead of toISOString().
    // This prevents Bangladesh timezone from shifting the date.
    const today = getLocalToday();

    recordDonation.mutate(
      {
        patientName: "Direct / Self Donation",
        hospitalName: "N/A",
        donationDate: today,
        notes: "Recorded via 'Donated Today' quick button",
      },

      {
        onSuccess: () => {
          toast.success(
            "Donation recorded successfully. Donor is deferred for 120 days.",
          );
        },

        onError: (err: any) => {
          toast.error(
            err?.error ||
              err?.message ||
              "Failed to record donation",
          );
        },
      },
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Copy phone
  // ─────────────────────────────────────────────────────────────────────────

  const handleCopy = (num: string) => {
    navigator.clipboard.writeText(num);

    setCopiedNumber(num);

    toast.success(
      "Phone number copied to clipboard",
    );

    setTimeout(() => {
      setCopiedNumber(null);
    }, 1500);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Loading
  // ─────────────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-[200px] w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Error
  // ─────────────────────────────────────────────────────────────────────────

  if (isError || !donor) {
    return (
      <div className="text-center p-8 text-destructive">
        Failed to load donor profile.
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Phones
  // ─────────────────────────────────────────────────────────────────────────

  const phones =
    donor.phone && Array.isArray(donor.phone)
      ? donor.phone
      : [];

  const primaryPhone =
    phones.find((p: any) => p.isPrimary) ||
    (phones.length > 0 ? phones[0] : null);

  const secondaryPhones = phones.filter(
    (p: any) =>
      primaryPhone &&
      p.id !== primaryPhone.id,
  );

  // ─────────────────────────────────────────────────────────────────────────
  // Phone renderer
  // ─────────────────────────────────────────────────────────────────────────

  const renderPhoneItem = (
    p: any,
    showLabel = true,
  ) => {
    if (!p) return null;

    const isCopied =
      copiedNumber === p.number;

    return (
      <div
        key={p.id || p.number}
        className="flex items-center justify-between gap-4 py-1.5 border-b border-muted last:border-0"
      >
        <div className="flex items-center gap-3 text-sm">
          <Phone className="h-4 w-4 text-primary shrink-0" />

          <span className="font-mono">
            {p.number}

            {showLabel && (
              <span className="text-xs text-muted-foreground ml-2">
                ({p.label})

                {p.isPrimary &&
                  " (Primary)"}
              </span>
            )}
          </span>
        </div>

        <div className="flex items-center gap-1 rounded-full border bg-muted/40 p-1">
          {/* Call */}

          <a
                href={`tel:${p.number}`}
                className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-7 w-7 rounded-full text-blue-600 hover:text-blue-700 hover:bg-blue-500/10")}
                title="Call"
              >
                <Phone className="h-3.5 w-3.5" />
              </a>

          {/* WhatsApp */}

          <a
                href={getWhatsAppUrl(p.number)}
              target="_blank"
              rel="noopener noreferrer"
                className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-7 w-7 rounded-full text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10")}
                title="WhatsApp"
              >
                <WhatsAppIcon className="h-3.5 w-3.5" />
              </a>

          {/* Copy */}

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10"
            onClick={() =>
              handleCopy(p.number)
            }
            title="Copy Number"
          >
            {isCopied ? (
              <Check className="h-3.5 w-3.5 text-emerald-600 animate-in fade-in zoom-in-50 duration-200" />
            ) : (
              <Copy className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────
  // UI
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* Overview Card */}
      {/* ═══════════════════════════════════════════════════════════════════ */}

      <Card className="bg-card shadow-sm border-muted">
        <CardHeader className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b">

          <div className="flex items-center gap-4">

            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary shrink-0">
              <User2 className="h-8 w-8" />
            </div>

            <div className="min-w-0">

              <CardTitle className="text-2xl flex items-center gap-3 flex-wrap">
                {donor.fullName}

                {(donor as any).isVerified && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-600 border border-blue-200 text-xs font-medium px-2 py-0.5"
                    title="Verified Voluntary Donor"
                  >
                    <BadgeCheck className="h-3.5 w-3.5" />
                    Verified
                  </span>
                )}

                <Badge
                  variant="outline"
                  className="text-lg px-2 bg-destructive/10 text-destructive border-destructive/20 font-mono"
                >
                  {donor.bloodType}
                </Badge>
              </CardTitle>

              <div className="text-sm text-muted-foreground mt-1 flex items-center gap-2 flex-wrap">

                {donor.isEligible ? (
                  <Badge className="bg-emerald-500">
                    Eligible
                  </Badge>
                ) : (
                  <Badge
                    variant="secondary"
                    className="bg-amber-500/20 text-amber-700"
                  >
                    Deferred
                  </Badge>
                )}

                <span>•</span>

                <span>
                  {donor.gender}
                </span>

                {donor.dob && (
                  <>
                    <span>•</span>

                    <span>
                      DOB:{" "}
                      {format(
                        new Date(donor.dob),
                        "PP",
                      )}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}

          <div className="flex gap-2 justify-start sm:justify-end w-full sm:w-auto">

            {/* ID Card */}

            {canView && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownloadIdCard}
              >
                <Download className="mr-2 h-4 w-4" />
                ID Card
              </Button>
            )}

            {/* Donated Today */}

            {canEdit && (
              <Button
                variant="default"
                size="sm"
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={
                  !donor.isEligible ||
                  recordDonation.isPending
                }
                onClick={
                  handleDonatedToday
                }
              >
                {recordDonation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Droplet className="mr-2 h-4 w-4" />
                )}

                Donated Today
              </Button>
            )}

            {/* More */}

            {(canEdit ||
              canApprove ||
              canDelete) && (
              <DropdownMenu>

                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>

                <DropdownMenuContent
                  align="end"
                  className="w-56"
                >

                  {/* Edit Profile */}

                  {canEdit && (
                    <DonorForm
                      donor={donor}
                      trigger={
                        <DropdownMenuItem
                          onSelect={(e) =>
                            e.preventDefault()
                          }
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Edit Profile
                        </DropdownMenuItem>
                      }
                    />
                  )}

                  {/* Record Donation */}

                  {canEdit && (
                    <DonationForm
                      donorId={donor.id}
                      disabled={
                        !donor.isEligible
                      }
                      trigger={
                        <DropdownMenuItem
                          disabled={
                            !donor.isEligible
                          }
                          onSelect={(e) =>
                            e.preventDefault()
                          }
                        >
                          <Droplet className="mr-2 h-4 w-4" />
                          Record Donation
                        </DropdownMenuItem>
                      }
                    />
                  )}

                  {/* Manual Deferral */}

                  {canApprove && (
                    <DeferralForm
                      donorId={donor.id}
                      trigger={
                        <DropdownMenuItem
                          className="text-amber-600 focus:text-amber-700 focus:bg-amber-50"
                          onSelect={(e) =>
                            e.preventDefault()
                          }
                        >
                          <ShieldAlert className="mr-2 h-4 w-4" />
                          Manual Deferral
                        </DropdownMenuItem>
                      }
                    />
                  )}

                  {/* Delete */}

                  {canDelete && (
                    <>
                      <DropdownMenuSeparator />

                      <DeleteDonorDialog
                        donorId={donor.id}
                        donorName={
                          donor.fullName
                        }
                        trigger={
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive focus:bg-destructive/10"
                            onSelect={(e) =>
                              e.preventDefault()
                            }
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Donor
                          </DropdownMenuItem>
                        }
                      />
                    </>
                  )}

                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardHeader>

        {/* ═══════════════════════════════════════════════════════════════ */}
        {/* Contact + Eligibility */}
        {/* ═══════════════════════════════════════════════════════════════ */}

        <CardContent className="pt-6 grid sm:grid-cols-2 gap-8">

          {/* Contact */}

          <div className="space-y-4">

            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
              Contact Info
            </h3>

            <div className="space-y-3">

              {/* Phones */}

              <div className="space-y-1">

                {primaryPhone ? (
                  renderPhoneItem(
                    primaryPhone,
                  )
                ) : typeof donor.phone ===
                    "string" &&
                  donor.phone ? (
                  renderPhoneItem({
                    number: donor.phone,
                    label: "Phone",
                    isPrimary: true,
                  })
                ) : (
                  <div className="flex items-center gap-3 text-sm text-muted-foreground py-1.5">
                    <Phone className="h-4 w-4 text-primary" />

                    <span>
                      No phone number
                    </span>
                  </div>
                )}

                {secondaryPhones.length >
                  0 && (
                  <div className="mt-1">

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setShowAllPhones(
                          !showAllPhones,
                        )
                      }
                      className="text-xs text-primary hover:bg-primary/5 flex items-center gap-1 h-8 px-2 -ml-2"
                    >
                      {showAllPhones ? (
                        <>
                          <ChevronUp className="h-3.5 w-3.5" />
                          Hide extra numbers
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3.5 w-3.5" />
                          Show more numbers (
                          {
                            secondaryPhones.length
                          }
                          )
                        </>
                      )}
                    </Button>

                    {showAllPhones && (
                      <div className="pl-4 mt-2 border-l-2 border-muted space-y-1 animate-in slide-in-from-top-1 duration-200">
                        {secondaryPhones.map(
                          (p: any) =>
                            renderPhoneItem(
                              p,
                            ),
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Email */}

              <div className="flex items-center gap-3 text-sm py-1.5">
                <Mail className="h-4 w-4 text-primary shrink-0" />

                <span>
                  {donor.email}
                </span>
              </div>

              {/* Address */}

              <div className="flex items-start gap-3 text-sm py-1.5">
                <MapPin className="h-4 w-4 text-primary shrink-0" />

                <span>
                  {donor.address}
                </span>
              </div>
            </div>
          </div>

          {/* Eligibility */}

          <div className="space-y-4">

            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
              Eligibility Status
            </h3>

            <div className="rounded-md border p-4 bg-muted/30">

              {donor.isEligible ? (

                <div className="flex items-start gap-3">

                  <Droplet className="h-5 w-5 text-emerald-500 shrink-0" />

                  <div>

                    <p className="font-medium text-sm">
                      Ready to Donate
                    </p>

                    <p className="text-xs text-muted-foreground mt-1">
                      This donor has completed
                      the required 120-day
                      waiting period and is
                      eligible for donation.
                    </p>

                  </div>
                </div>

              ) : (

                <div className="flex items-start gap-3">

                  <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0" />

                  <div>

                    <p className="font-medium text-sm text-amber-700">
                      Deferred
                    </p>

                    <p className="text-xs text-muted-foreground mt-1">
                      {donor.deferralReason ||
                        "Recent donation — 120-day rest period."}
                    </p>

                    {donor.deferredUntil && (
                      <p className="text-xs font-semibold mt-2">
                        Eligible again on:{" "}
                        {format(
                          new Date(
                            donor.deferredUntil,
                          ),
                          "PP",
                        )}
                      </p>
                    )}

                  </div>
                </div>
              )}

            </div>
          </div>

        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* Admin Notes */}
      {/* ═══════════════════════════════════════════════════════════════════ */}

      <Card className="bg-amber-50/50 border-amber-200/50 shadow-sm">

        <CardHeader className="pb-3 flex flex-row items-center justify-between">

          <CardTitle className="text-lg text-amber-900">
            Admin Notes
          </CardTitle>

          {!isEditingNotes &&
            canEditNotes && (
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setIsEditingNotes(true)
                }
                className="h-8 border-amber-200 text-amber-700 hover:bg-amber-100"
              >
                <Edit className="h-3.5 w-3.5 mr-2" />
                Edit Notes
              </Button>
            )}
        </CardHeader>

        <CardContent>

          {isEditingNotes ? (

            <div className="space-y-3">

              <Textarea
                placeholder="Add special observations or notes about this donor..."
                value={notes}
                onChange={(e) =>
                  setNotes(e.target.value)
                }
                className="min-h-[100px] bg-white border-amber-200 focus-visible:ring-amber-500"
              />

              <div className="flex gap-2 justify-end">

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setNotes(
                      (donor as any)
                        .notes || "",
                    );

                    setIsEditingNotes(
                      false,
                    );
                  }}
                >
                  Cancel
                </Button>

                <Button
                  size="sm"
                  className="bg-amber-600 hover:bg-amber-700"
                  disabled={
                    updateDonor.isPending
                  }
                  onClick={
                    handleSaveNotes
                  }
                >
                  {updateDonor.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}

                  Save Notes
                </Button>

              </div>
            </div>

          ) : (

            <div className="min-h-[60px] text-sm text-amber-800 whitespace-pre-wrap">

              {(donor as any).notes ? (
                (donor as any).notes
              ) : (
                <span className="text-amber-700/50 italic">
                  No notes added yet.
                </span>
              )}

            </div>
          )}

        </CardContent>
      </Card>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* Donation History */}
      {/* ═══════════════════════════════════════════════════════════════════ */}

      <Card className="bg-card shadow-sm border-muted">

        <CardHeader>
          <CardTitle className="text-lg">
            Donation History
          </CardTitle>
        </CardHeader>

        <CardContent>
          <Separator />

          <DonationTimeline
            donorId={donor.id}
          />
        </CardContent>

      </Card>
    </div>
  );
}