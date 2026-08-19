import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";
import { prisma } from "@/lib/db";
import { withAuth, apiError } from "@/lib/api-helpers";

// ─── GET /api/donors/[id]/card ─────────────────────────────────────────────────
// Generates a printable, landscape ID card (PDF) for a donor: name, phone,
// date of birth, a blood type badge, and a QR code linking to their public
// /d/[token] page where they can view and self-update their donation date.
// No photo — the donor system does not store profile photos.

export const GET = withAuth(
  async (req: NextRequest, _session, params) => {
    const id = Number(params?.id);
    if (isNaN(id)) return apiError("Invalid donor ID", 400);

    const donor = await prisma.donor.findFirst({
      where: { id, isDeleted: false },
      include: { phone: true },
    });

    if (!donor) return apiError("Donor not found", 404);

    const primaryPhone =
      donor.phone.find((p) => p.isPrimary)?.number || donor.phone[0]?.number || "N/A";

    const dobText = donor.dob
      ? new Date(donor.dob).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
      : "N/A";

    const origin = req.nextUrl.origin;
    const cardUrl = `${origin}/d/${donor.publicToken}`;

    const qrPngBuffer = await QRCode.toBuffer(cardUrl, {
      type: "png",
      width: 300,
      margin: 1,
      color: { dark: "#3D0B12", light: "#FFFFFF" },
    });

    // Standard CR80 ID card size, LANDSCAPE (85.6mm x 53.98mm), in PDF points
    const CARD_WIDTH = 243;
    const CARD_HEIGHT = 153;

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([CARD_WIDTH, CARD_HEIGHT]);

    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const brandColor = rgb(0.239, 0.043, 0.071); // #3D0B12
    const grayText = rgb(0.45, 0.45, 0.45);
    const darkText = rgb(0.1, 0.1, 0.1);

    // ── Card background + thin border ──────────────────────────────────
    page.drawRectangle({ x: 0, y: 0, width: CARD_WIDTH, height: CARD_HEIGHT, color: rgb(1, 1, 1) });
    page.drawRectangle({
      x: 1,
      y: 1,
      width: CARD_WIDTH - 2,
      height: CARD_HEIGHT - 2,
      borderColor: rgb(0.85, 0.85, 0.85),
      borderWidth: 1,
    });

    // ── Header band ─────────────────────────────────────────────────────
    const headerHeight = 30;
    page.drawRectangle({
      x: 0,
      y: CARD_HEIGHT - headerHeight,
      width: CARD_WIDTH,
      height: headerHeight,
      color: brandColor,
    });
    page.drawText("QUANTUM BLOOD DONOR POOL", {
      x: 10,
      y: CARD_HEIGHT - 15,
      size: 9.5,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    page.drawText("Voluntary Donor Identity Card", {
      x: 10,
      y: CARD_HEIGHT - 25,
      size: 6,
      font: fontRegular,
      color: rgb(0.9, 0.8, 0.8),
    });

    // ── Blood type badge (left column) ───────────────────────────────────
    const badgeX = 10;
    const badgeY = 14;
    const badgeSize = 52;
    page.drawRectangle({
      x: badgeX,
      y: badgeY,
      width: badgeSize,
      height: badgeSize,
      color: brandColor,
    });
    const btSize = 22;
    const btWidth = fontBold.widthOfTextAtSize(donor.bloodType, btSize);
    page.drawText(donor.bloodType, {
      x: badgeX + (badgeSize - btWidth) / 2,
      y: badgeY + badgeSize / 2 - 8,
      size: btSize,
      font: fontBold,
      color: rgb(1, 1, 1),
    });
    const labelText = "BLOOD TYPE";
    const labelSize = 6;
    const labelWidth = fontRegular.widthOfTextAtSize(labelText, labelSize);
    page.drawText(labelText, {
      x: badgeX + (badgeSize - labelWidth) / 2,
      y: badgeY + badgeSize / 2 - 20,
      size: labelSize,
      font: fontRegular,
      color: rgb(0.9, 0.8, 0.8),
    });

    // ── Donor detail fields (middle column) ──────────────────────────────
    const fieldX = badgeX + badgeSize + 14;
    const qrSize = 62;
    const fieldWidth = CARD_WIDTH - fieldX - qrSize - 20;
    let cursorY = CARD_HEIGHT - headerHeight - 16;

    const drawField = (label: string, value: string) => {
      page.drawText(label.toUpperCase(), {
        x: fieldX,
        y: cursorY,
        size: 6.5,
        font: fontRegular,
        color: grayText,
      });
      cursorY -= 11;
      page.drawText(value, {
        x: fieldX,
        y: cursorY,
        size: 11,
        font: fontBold,
        color: darkText,
        maxWidth: fieldWidth,
      });
      cursorY -= 19;
    };

    drawField("Name", donor.fullName);
    drawField("Phone", primaryPhone);
    drawField("Date of Birth", dobText);

    // ── QR code (right column) ───────────────────────────────────────────
    const qrImage = await pdfDoc.embedPng(qrPngBuffer);
    const qrX = CARD_WIDTH - qrSize - 10;
    const qrY = 16;
    page.drawImage(qrImage, { x: qrX, y: qrY, width: qrSize, height: qrSize });
    page.drawText("Scan to update", {
      x: qrX,
      y: qrY - 9,
      size: 5.5,
      font: fontRegular,
      color: grayText,
    });

    // ── Serial / ID number (bottom-left) ─────────────────────────────────
    const serial = `ID: DNR-${String(donor.id).padStart(6, "0")}`;
    page.drawText(serial, {
      x: badgeX,
      y: 6,
      size: 6,
      font: fontRegular,
      color: grayText,
    });

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="donor-card-${donor.fullName.replace(/\s+/g, "-")}.pdf"`,
      },
    });
  },
  { permission: "donorView" },
);
