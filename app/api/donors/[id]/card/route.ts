import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api-helpers";

// GET /api/donors/[id]/card
export const GET = withAuth(
  async (_req: NextRequest, _session, params) => {
    const id = Number(params?.id);

    if (Number.isNaN(id)) {
      return NextResponse.json(
        { error: "Invalid donor ID" },
        { status: 400 }
      );
    }

    const donor = await prisma.donor.findFirst({
      where: {
        id,
        isDeleted: false,
      },
      include: {
        phone: true,
        donations: {
          orderBy: {
            donationDate: "desc",
          },
          take: 1,
        },
      },
    });

    if (!donor) {
      return NextResponse.json(
        { error: "Donor not found" },
        { status: 404 }
      );
    }

    // ─────────────────────────────────────────────
    // Public donor URL
    // ─────────────────────────────────────────────

    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXTAUTH_URL ||
      "http://localhost:3000";

    const publicUrl = `${baseUrl}/d/${donor.publicToken}`;

    // ─────────────────────────────────────────────
    // Generate QR Code
    // ─────────────────────────────────────────────

    const qrDataUrl = await QRCode.toDataURL(publicUrl, {
      width: 300,
      margin: 1,
      errorCorrectionLevel: "H",
    });

    const qrBase64 = qrDataUrl.split(",")[1];

    if (!qrBase64) {
      return NextResponse.json(
        { error: "Failed to generate QR code" },
        { status: 500 }
      );
    }

    const qrBytes = Buffer.from(qrBase64, "base64");

    // ─────────────────────────────────────────────
    // Create PDF
    // ─────────────────────────────────────────────

    const pdfDoc = await PDFDocument.create();

    const page = pdfDoc.addPage([595, 842]);

    const { width, height } = page.getSize();

    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Background
    page.drawRectangle({
      x: 0,
      y: 0,
      width,
      height,
      color: rgb(0.97, 0.98, 0.99),
    });

    // Header
    page.drawRectangle({
      x: 40,
      y: height - 150,
      width: width - 80,
      height: 100,
      color: rgb(0.04, 0.45, 0.25),
    });

    page.drawText("BLOOD DONOR ID CARD", {
      x: 170,
      y: height - 90,
      size: 20,
      font: boldFont,
      color: rgb(1, 1, 1),
    });

    page.drawText("Verified Blood Donor", {
      x: 215,
      y: height - 115,
      size: 11,
      font: regularFont,
      color: rgb(0.9, 1, 0.95),
    });

    // ─────────────────────────────────────────────
    // Donor Information
    // ─────────────────────────────────────────────

    const left = 65;

    page.drawText("DONOR INFORMATION", {
      x: left,
      y: height - 195,
      size: 13,
      font: boldFont,
      color: rgb(0.04, 0.45, 0.25),
    });

    page.drawText("Name", {
      x: left,
      y: height - 230,
      size: 10,
      font: boldFont,
    });

    page.drawText(donor.fullName, {
      x: left + 100,
      y: height - 230,
      size: 12,
      font: regularFont,
    });

    page.drawText("Blood Group", {
      x: left,
      y: height - 260,
      size: 10,
      font: boldFont,
    });

    page.drawText(donor.bloodType, {
      x: left + 100,
      y: height - 260,
      size: 18,
      font: boldFont,
      color: rgb(0.75, 0.05, 0.05),
    });

    page.drawText("Gender", {
      x: left,
      y: height - 295,
      size: 10,
      font: boldFont,
    });

    page.drawText(donor.gender, {
      x: left + 100,
      y: height - 295,
      size: 11,
      font: regularFont,
    });

    const primaryPhone =
      donor.phone.find((p) => p.isPrimary) || donor.phone[0];

    page.drawText("Phone", {
      x: left,
      y: height - 325,
      size: 10,
      font: boldFont,
    });

    page.drawText(primaryPhone?.number || "N/A", {
      x: left + 100,
      y: height - 325,
      size: 11,
      font: regularFont,
    });

    page.drawText("Status", {
      x: left,
      y: height - 355,
      size: 10,
      font: boldFont,
    });

    page.drawText(donor.isEligible ? "ELIGIBLE" : "DEFERRED", {
      x: left + 100,
      y: height - 355,
      size: 11,
      font: boldFont,
      color: donor.isEligible
        ? rgb(0.04, 0.45, 0.25)
        : rgb(0.75, 0.45, 0.05),
    });

    // ─────────────────────────────────────────────
    // Donor ID
    // ─────────────────────────────────────────────

    page.drawText("Donor ID", {
      x: left,
      y: height - 390,
      size: 10,
      font: boldFont,
    });

    page.drawText(String(donor.id), {
      x: left + 100,
      y: height - 390,
      size: 11,
      font: regularFont,
    });

    // ─────────────────────────────────────────────
    // QR Code
    // ─────────────────────────────────────────────

    const qrImage = await pdfDoc.embedPng(qrBytes);

    page.drawImage(qrImage, {
      x: width - 190,
      y: height - 410,
      width: 120,
      height: 120,
    });

    page.drawText("Scan to view donor profile", {
      x: width - 205,
      y: height - 430,
      size: 8,
      font: regularFont,
      color: rgb(0.35, 0.35, 0.35),
    });

    // ─────────────────────────────────────────────
    // Footer
    // ─────────────────────────────────────────────

    page.drawLine({
      start: {
        x: 60,
        y: 120,
      },
      end: {
        x: width - 60,
        y: 120,
      },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    });

    page.drawText(
      "This card is issued for blood donation identification purposes.",
      {
        x: 120,
        y: 90,
        size: 8,
        font: regularFont,
        color: rgb(0.4, 0.4, 0.4),
      }
    );

    page.drawText("Blood Management System", {
      x: 210,
      y: 65,
      size: 9,
      font: boldFont,
      color: rgb(0.04, 0.45, 0.25),
    });

    // ─────────────────────────────────────────────
    // Save PDF
    // ─────────────────────────────────────────────

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="donor-${donor.id}-id-card.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  },
  { permission: "donorView" }
);