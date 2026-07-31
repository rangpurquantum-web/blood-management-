// Black & White Print-Friendly PDF export utility for Donor Report
// Uses jsPDF + autoTable (client-side only)

import type { Filters } from "./types";

export interface DonorForPdf {
  id: number;
  fullName: string;
  gender: string;
  dob: string;
  bloodType: string;
  address: string;
  isEligible: boolean;
  deferredUntil: string | null;
  createdAt: string;
  phone: { number: string; label: string }[];
  lastDonationDate: string | null;
}

function buildFilterSummary(f: Filters): string {
  const parts: string[] = [];
  if (f.bloodGroup)  parts.push(`Blood Group: ${f.bloodGroup}`);
  if (f.area)        parts.push(`Area: ${f.area}`);
  if (f.gender)      parts.push(`Gender: ${f.gender}`);
  if (f.eligible !== "")
    parts.push(f.eligible === "true" ? "Eligible Now" : "Not Eligible Yet");
  if (f.ageMin || f.ageMax)
    parts.push(`Age: ${f.ageMin || "0"}–${f.ageMax || "∞"}`);
  if (f.createdFrom || f.createdTo)
    parts.push(`Registered: ${f.createdFrom || "…"} to ${f.createdTo || "…"}`);
  if (f.lastDonationFrom || f.lastDonationTo)
    parts.push(`Last Donation: ${f.lastDonationFrom || "…"} to ${f.lastDonationTo || "…"}`);
  return parts.length ? parts.join(" · ") : "All approved donors";
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-GB", {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch {
    return "—";
  }
}

function calcAge(dobStr: string): number {
  const dob = new Date(dobStr);
  const diff = Date.now() - dob.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25));
}

/** Fetches ALL matching donors (no pagination) for export */
async function fetchAllDonors(filters: Filters): Promise<DonorForPdf[]> {
  const params = new URLSearchParams();
  if (filters.bloodGroup)  params.set("bloodGroup", filters.bloodGroup);
  if (filters.area)        params.set("area", filters.area);
  if (filters.eligible)    params.set("eligible", filters.eligible);
  if (filters.gender)      params.set("gender", filters.gender);
  if (filters.ageMin)      params.set("ageMin", filters.ageMin);
  if (filters.ageMax)      params.set("ageMax", filters.ageMax);
  if (filters.createdFrom) params.set("createdFrom", filters.createdFrom);
  if (filters.createdTo)   params.set("createdTo", filters.createdTo);
  if (filters.lastDonationFrom) params.set("lastDonationFrom", filters.lastDonationFrom);
  if (filters.lastDonationTo)   params.set("lastDonationTo", filters.lastDonationTo);
  params.set("page", "1");
  params.set("pageSize", "5000"); // fetch all

  const res = await fetch(`/api/reports/donors?${params.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch donors for export");
  const json = await res.json();
  return json.donors as DonorForPdf[];
}

export async function exportDonorReportToPdf(
  filters: Filters,
  total: number,
): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const donors = await fetchAllDonors(filters);

  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const PAGE_W = doc.internal.pageSize.getWidth();
  const TODAY = new Date().toLocaleDateString("en-GB", {
    day: "2-digit", month: "long", year: "numeric",
  });

  // ── Black & White Monochrome Palette ──────────────────────────────────────
  const BLACK     = [0, 0, 0]       as [number, number, number];
  const DARK_GREY = [70, 70, 70]    as [number, number, number];
  const HEAD_BG   = [235, 235, 235] as [number, number, number]; // light grey header (saves ink)
  const ALT_BG    = [250, 250, 250] as [number, number, number]; // subtle zebra striping
  const BORDER    = [160, 160, 160] as [number, number, number];

  // ── Header (Clean B&W layout) ─────────────────────────────────────────────
  doc.setTextColor(...BLACK);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text("BloodManager", 36, 32);

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("Donor List Report", 165, 32);

  doc.setFontSize(9);
  doc.setTextColor(...DARK_GREY);
  doc.text(`Generated: ${TODAY}`, PAGE_W - 36, 32, { align: "right" });

  // Top Divider line
  doc.setDrawColor(...BLACK);
  doc.setLineWidth(1.5);
  doc.line(36, 42, PAGE_W - 36, 42);

  // ── Filter Summary & Total Count ──────────────────────────────────────────
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...DARK_GREY);

  const summary = buildFilterSummary(filters);
  const summaryLines = doc.splitTextToSize(`Filters Applied: ${summary}`, PAGE_W - 160);
  doc.text(summaryLines, 36, 56);

  doc.setFont("helvetica", "bold");
  doc.setTextColor(...BLACK);
  doc.text(`Total: ${total} donor${total !== 1 ? "s" : ""}`, PAGE_W - 36, 56, { align: "right" });

  // Sub Divider line
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.5);
  doc.line(36, 68, PAGE_W - 36, 68);

  // ── Table (Ink-saving Black & White) ──────────────────────────────────────
  const rows = donors.map((d, idx) => [
    idx + 1,
    d.fullName,
    d.bloodType,
    `${d.gender}, ${calcAge(d.dob)} yrs`,
    d.phone?.[0]?.number ?? "—",
    d.address,
    d.isEligible ? "Eligible" : "Deferred",
    formatDate(d.lastDonationDate),
    formatDate(d.createdAt),
  ]);

  autoTable(doc, {
    startY: 74,
    head: [["#", "Name", "Blood", "Gender / Age", "Phone", "Area", "Status", "Last Donation", "Registered"]],
    body: rows,
    margin: { left: 36, right: 36 },
    styles: {
      fontSize: 8,
      cellPadding: 5,
      textColor: BLACK,
      lineColor: BORDER,
      lineWidth: 0.5,
    },
    headStyles: {
      fillColor: HEAD_BG,
      textColor: BLACK,
      fontStyle: "bold",
      fontSize: 8.5,
      halign: "left",
      lineColor: BLACK,
      lineWidth: 0.8,
    },
    alternateRowStyles: {
      fillColor: ALT_BG,
    },
    columnStyles: {
      0:  { halign: "center", cellWidth: 24 },      // #
      1:  { cellWidth: 100, fontStyle: "bold" },     // Name
      2:  { halign: "center", cellWidth: 42, fontStyle: "bold" }, // Blood
      3:  { cellWidth: 68 },                          // Gender/Age
      4:  { cellWidth: 74, font: "courier" },         // Phone
      5:  { cellWidth: "auto" },                     // Area
      6:  { halign: "center", cellWidth: 55 },       // Status
      7:  { halign: "center", cellWidth: 70 },       // Last Donation
      8:  { halign: "center", cellWidth: 70 },       // Registered
    },
  });

  // ── Footer on each page ───────────────────────────────────────────────────
  const totalPgs = (doc.internal as any).getNumberOfPages();
  for (let p = 1; p <= totalPgs; p++) {
    doc.setPage(p);
    const y = doc.internal.pageSize.getHeight() - 16;
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.5);
    doc.line(36, y - 6, PAGE_W - 36, y - 6);
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...DARK_GREY);
    doc.text("BloodManager — Official Donor Report", 36, y);
    doc.text(`Page ${p} of ${totalPgs}`, PAGE_W - 36, y, { align: "right" });
  }

  // ── Save ──────────────────────────────────────────────────────────────────
  const filename = `donor-report-${new Date().toISOString().split("T")[0]}.pdf`;
  doc.save(filename);
}
