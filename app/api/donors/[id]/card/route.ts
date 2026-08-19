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

        // Latest donation only
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

    // --------------------------------------------------
    // Get deployed URL automatically
    // No .env required
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

    const publicUrl =
      `${baseUrl}/d/${donor.publicToken}`;

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

    const qrBytes = Buffer.from(
      qrBase64,
      "base64"
    );

    // --------------------------------------------------
    // Create PDF
    // --------------------------------------------------

    const pdfDoc = await PDFDocument.create();

    // Standard ID card size
    // 85.60mm × 53.98mm
    const cardWidth = 242;
    const cardHeight = 153;

    const page = pdfDoc.addPage([
      cardWidth,
      cardHeight,
    ]);

    const regularFont =
      await pdfDoc.embedFont(
        StandardFonts.Helvetica
      );

    const boldFont =
      await pdfDoc.embedFont(
        StandardFonts.HelveticaBold
      );

    // --------------------------------------------------
    // Colors
    // --------------------------------------------------

    const darkRed = rgb(
      0.65,
      0.02,
      0.05
    );

    const red = rgb(
      0.85,
      0.04,
      0.06
    );

    const dark = rgb(
      0.08,
      0.08,
      0.08
    );

    const gray = rgb(
      0.45,
      0.45,
      0.45
    );

    const white = rgb(
      1,
      1,
      1
    );

    // --------------------------------------------------
    // Background
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
    // Header
    // --------------------------------------------------

    page.drawRectangle({
      x: 4,
      y: cardHeight - 32,
      width: cardWidth - 8,
      height: 28,
      color: darkRed,
    });

    page.drawText(
      "QUANTUM VOLENTARY BLOOD DONATION PROGRAMME",
      {
        x: 16,
        y: cardHeight - 17,
        size: 7.8,
        font: boldFont,
        color: white,
      }
    );

    // --------------------------------------------------
    // Large Blood Group
    // --------------------------------------------------

    page.drawText(donor.bloodType, {
      x: 16,
      y: 66,
      size: 42,
      font: boldFont,
      color: red,
    });

    page.drawText("BLOOD GROUP", {
      x: 25,
      y: 52,
      size: 6,
      font: boldFont,
      color: gray,
    });

    // --------------------------------------------------
    // Donor Information
    // --------------------------------------------------

    const infoX = 82;

    // NAME

    page.drawText("NAME", {
      x: infoX,
      y: 103,
      size: 6,
      font: boldFont,
      color: gray,
    });

    page.drawText(donor.fullName, {
      x: infoX,
      y: 91,
      size: 10,
      font: boldFont,
      color: dark,
    });

    // DATE OF BIRTH

    page.drawText("DATE OF BIRTH", {
      x: infoX,
      y: 74,
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
        y: 63,
        size: 8.5,
        font: regularFont,
        color: dark,
      }
    );

    // LAST DONATION

    page.drawText("LAST DONATION", {
      x: infoX,
      y: 49,
      size: 6,
      font: boldFont,
      color: gray,
    });

    page.drawText(
      donor.donations[0]
        ? donor.donations[0].donationDate.toLocaleDateString(
            "en-GB"
          )
        : "NO RECORD",
      {
        x: infoX,
        y: 38,
        size: 8.5,
        font: regularFont,
        color: dark,
      }
    );

    // --------------------------------------------------
    // QR Code
    // --------------------------------------------------

    const qrImage =
      await pdfDoc.embedPng(qrBytes);

    page.drawImage(qrImage, {
      x: 174,
      y: 26,
      width: 52,
      height: 52,
    });

    page.drawText("SCAN TO VERIFY", {
      x: 177,
      y: 18,
      size: 5.5,
      font: boldFont,
      color: gray,
    });

    // --------------------------------------------------
    // Donor ID
    // --------------------------------------------------

    page.drawText(
      `ID: ${donor.id}`,
      {
        x: 16,
        y: 18,
        size: 6.5,
        font: regularFont,
        color: gray,
      }
    );

    // --------------------------------------------------
    // Save PDF
    // --------------------------------------------------

    const pdfBytes =
      await pdfDoc.save();

    return new NextResponse(
      Buffer.from(pdfBytes),
      {
        status: 200,
        headers: {
          "Content-Type":
            "application/pdf",

          "Content-Disposition":
            `attachment; filename="donor-${donor.id}-id-card.pdf"`,

          "Cache-Control":
            "no-store",
        },
      }
    );
  },
  {
    permission: "donorView",
  }
);