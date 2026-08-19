import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api-helpers";

// GET /api/donors/[id]/card
export const GET = withAuth(
  async (req: NextRequest, _session, params) => {
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
      },
    });

    if (!donor) {
      return NextResponse.json(
        { error: "Donor not found" },
        { status: 404 }
      );
    }

    // --------------------------------------------------
    // IMPORTANT:
    // Use the actual deployed Vercel domain.
    // No .env required.
    // --------------------------------------------------

    const host = req.headers.get("host");

    if (!host) {
      return NextResponse.json(
        { error: "Unable to determine application URL" },
        { status: 500 }
      );
    }

    const protocol =
      req.headers.get("x-forwarded-proto") || "https";

    const baseUrl = `${protocol}://${host}`;

    // Public donor page
    const publicUrl = `${baseUrl}/d/${donor.publicToken}`;

    // --------------------------------------------------
    // Generate QR
    // --------------------------------------------------

    const qrDataUrl = await QRCode.toDataURL(publicUrl, {
      width: 500,
      margin: 2,
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

    // --------------------------------------------------
    // Create PDF
    // --------------------------------------------------

    const pdfDoc = await PDFDocument.create();

    /*
     * ID card size:
     * 85.60mm × 53.98mm
     * approximately 242 × 153 PDF points
     */
    const cardWidth = 242;
    const cardHeight = 153;

    const page = pdfDoc.addPage([
      cardWidth,
      cardHeight,
    ]);

    const regularFont = await pdfDoc.embedFont(
      StandardFonts.Helvetica
    );

    const boldFont = await pdfDoc.embedFont(
      StandardFonts.HelveticaBold
    );

    // --------------------------------------------------
    // Colors
    // --------------------------------------------------

    const darkRed = rgb(0.65, 0.02, 0.05);
    const red = rgb(0.85, 0.04, 0.06);
    const dark = rgb(0.08, 0.08, 0.08);
    const gray = rgb(0.45, 0.45, 0.45);
    const lightGray = rgb(0.94, 0.94, 0.94);
    const white = rgb(1, 1, 1);

    // --------------------------------------------------
    // Card background
    // --------------------------------------------------

    page.drawRectangle({
      x: 0,
      y: 0,
      width: cardWidth,
      height: cardHeight,
      color: white,
    });

    // Border

    page.drawRectangle({
      x: 3,
      y: 3,
      width: cardWidth - 6,
      height: cardHeight - 6,
      borderColor: darkRed,
      borderWidth: 1.5,
    });

    // --------------------------------------------------
    // Top Header
    // --------------------------------------------------

    page.drawRectangle({
      x: 4,
      y: cardHeight - 32,
      width: cardWidth - 8,
      height: 28,
      color: darkRed,
    });

    // Organization name

    page.drawText(
      "QUANTUM VOLENTARY BLOOD DONATION PROGRAMME",
      {
        x: 15,
        y: cardHeight - 17,
        size: 8.5,
        font: boldFont,
        color: white,
      }
    );

    // --------------------------------------------------
    // Blood Group - Large
    // --------------------------------------------------

    page.drawText(donor.bloodType, {
      x: 18,
      y: 65,
      size: 43,
      font: boldFont,
      color: red,
    });

    // Small label

    page.drawText("BLOOD", {
      x: 29,
      y: 55,
      size: 6.5,
      font: boldFont,
      color: gray,
    });

    page.drawText("GROUP", {
      x: 29,
      y: 47,
      size: 6.5,
      font: boldFont,
      color: gray,
    });

    // --------------------------------------------------
    // Donor Information
    // --------------------------------------------------

    const infoX = 82;

    // Name

    page.drawText("NAME", {
      x: infoX,
      y: 104,
      size: 6,
      font: boldFont,
      color: gray,
    });

    page.drawText(donor.fullName, {
      x: infoX,
      y: 92,
      size: 10.5,
      font: boldFont,
      color: dark,
    });

    // DOB

    page.drawText("DATE OF BIRTH", {
      x: infoX,
      y: 73,
      size: 6,
      font: boldFont,
      color: gray,
    });

    page.drawText(
      donor.dob
        ? donor.dob.toLocaleDateString("en-GB")
        : "N/A",
      {
        x: infoX,
        y: 62,
        size: 9,
        font: regularFont,
        color: dark,
      }
    );

    // Donor ID

    page.drawText("DONOR ID", {
      x: infoX,
      y: 44,
      size: 6,
      font: boldFont,
      color: gray,
    });

    page.drawText(String(donor.id), {
      x: infoX,
      y: 33,
      size: 8,
      font: regularFont,
      color: dark,
    });

    // --------------------------------------------------
    // QR Code
    // --------------------------------------------------

    const qrImage = await pdfDoc.embedPng(qrBytes);

    page.drawImage(qrImage, {
      x: 174,
      y: 25,
      width: 55,
      height: 55,
    });

    // --------------------------------------------------
    // Footer
    // --------------------------------------------------

    page.drawText("SCAN TO VERIFY", {
      x: 181,
      y: 17,
      size: 5.5,
      font: boldFont,
      color: gray,
    });

    // --------------------------------------------------
    // Save
    // --------------------------------------------------

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
  {
    permission: "donorView",
  }
);