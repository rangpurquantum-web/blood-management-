import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api-helpers";

// GET /api/donors/[id]/card
export const GET = withAuth(
  async (_req: NextRequest, _session, params) => {
    const id = Number(params?.id);

    if (!Number.isInteger(id) || id <= 0) {
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
    });

    if (!donor) {
      return NextResponse.json(
        { error: "Donor not found" },
        { status: 404 }
      );
    }

    /*
     * IMPORTANT:
     * QR code must point to the PUBLIC donor page.
     *
     * Production:
     * NEXT_PUBLIC_APP_URL=https://your-domain.com
     *
     * Local:
     * http://localhost:3000
     */

    const baseUrl = (
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXTAUTH_URL ||
      "http://localhost:3000"
    ).replace(/\/$/, "");

    const publicUrl = `${baseUrl}/d/${donor.publicToken}`;

    // Generate QR
    const qrDataUrl = await QRCode.toDataURL(publicUrl, {
      width: 500,
      margin: 2,
      errorCorrectionLevel: "H",
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
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
    // CREATE ID CARD
    // --------------------------------------------------

    const pdfDoc = await PDFDocument.create();

    /*
     * ID card size:
     * 360 x 230 points
     *
     * Landscape compact card
     */
    const page = pdfDoc.addPage([360, 230]);

    const { width, height } = page.getSize();

    const regularFont = await pdfDoc.embedFont(
      StandardFonts.Helvetica
    );

    const boldFont = await pdfDoc.embedFont(
      StandardFonts.HelveticaBold
    );

    // Colors
    const darkGreen = rgb(0.02, 0.32, 0.18);
    const green = rgb(0.04, 0.48, 0.27);
    const red = rgb(0.78, 0.04, 0.04);
    const darkText = rgb(0.08, 0.08, 0.08);
    const mutedText = rgb(0.35, 0.35, 0.35);
    const white = rgb(1, 1, 1);
    const lightBg = rgb(0.97, 0.98, 0.97);

    // --------------------------------------------------
    // CARD BACKGROUND
    // --------------------------------------------------

    page.drawRectangle({
      x: 0,
      y: 0,
      width,
      height,
      color: lightBg,
    });

    // Outer border
    page.drawRectangle({
      x: 5,
      y: 5,
      width: width - 10,
      height: height - 10,
      borderColor: darkGreen,
      borderWidth: 2,
      color: lightBg,
    });

    // --------------------------------------------------
    // HEADER
    // --------------------------------------------------

    page.drawRectangle({
      x: 6,
      y: height - 52,
      width: width - 12,
      height: 46,
      color: darkGreen,
    });

    // Programme title
    const title =
      "QUANTUM VOLUNTARY BLOOD DONATION PROGRAMME";

    const titleSize = 11;

    const titleWidth = boldFont.widthOfTextAtSize(
      title,
      titleSize
    );

    page.drawText(title, {
      x: (width - titleWidth) / 2,
      y: height - 27,
      size: titleSize,
      font: boldFont,
      color: white,
    });

    // Small subtitle
    const subtitle = "DONOR IDENTIFICATION CARD";
    const subtitleSize = 7.5;

    const subtitleWidth = regularFont.widthOfTextAtSize(
      subtitle,
      subtitleSize
    );

    page.drawText(subtitle, {
      x: (width - subtitleWidth) / 2,
      y: height - 41,
      size: subtitleSize,
      font: regularFont,
      color: rgb(0.88, 1, 0.92),
    });

    // --------------------------------------------------
    // BLOOD GROUP AREA
    // --------------------------------------------------

    /*
     * Left side acts like the photo area
     * but instead displays the blood group.
     */

    page.drawRectangle({
      x: 18,
      y: 82,
      width: 105,
      height: 82,
      color: white,
      borderColor: red,
      borderWidth: 2,
    });

    const bloodGroup = donor.bloodType || "N/A";

    const bloodSize =
      bloodGroup.length <= 3 ? 43 : 34;

    const bloodWidth = boldFont.widthOfTextAtSize(
      bloodGroup,
      bloodSize
    );

    page.drawText(bloodGroup, {
      x: 18 + (105 - bloodWidth) / 2,
      y: 108,
      size: bloodSize,
      font: boldFont,
      color: red,
    });

    const bloodLabel = "BLOOD GROUP";
    const bloodLabelSize = 7;

    const bloodLabelWidth =
      boldFont.widthOfTextAtSize(
        bloodLabel,
        bloodLabelSize
      );

    page.drawText(bloodLabel, {
      x: 18 + (105 - bloodLabelWidth) / 2,
      y: 91,
      size: bloodLabelSize,
      font: boldFont,
      color: mutedText,
    });

    // --------------------------------------------------
    // DONOR INFORMATION
    // --------------------------------------------------

    const infoX = 138;

    // NAME label
    page.drawText("NAME", {
      x: infoX,
      y: 143,
      size: 7,
      font: boldFont,
      color: mutedText,
    });

    // Name
    const name =
      donor.fullName.length > 26
        ? donor.fullName.substring(0, 26) + "..."
        : donor.fullName;

    page.drawText(name, {
      x: infoX,
      y: 126,
      size: 13,
      font: boldFont,
      color: darkText,
    });

    // DOB
    page.drawText("DATE OF BIRTH", {
      x: infoX,
      y: 103,
      size: 7,
      font: boldFont,
      color: mutedText,
    });

    let dobText = "N/A";

    if (donor.dob) {
      const dob = new Date(donor.dob);

      const day = String(dob.getDate()).padStart(2, "0");
      const month = String(
        dob.getMonth() + 1
      ).padStart(2, "0");
      const year = dob.getFullYear();

      dobText = `${day}/${month}/${year}`;
    }

    page.drawText(dobText, {
      x: infoX,
      y: 87,
      size: 11,
      font: regularFont,
      color: darkText,
    });

    // --------------------------------------------------
    // QR CODE
    // --------------------------------------------------

    const qrImage = await pdfDoc.embedPng(qrBytes);

    page.drawImage(qrImage, {
      x: width - 100,
      y: 67,
      width: 75,
      height: 75,
    });

    // --------------------------------------------------
    // FOOTER LINE
    // --------------------------------------------------

    page.drawLine({
      start: {
        x: 18,
        y: 52,
      },
      end: {
        x: width - 18,
        y: 52,
      },
      thickness: 1,
      color: rgb(0.8, 0.8, 0.8),
    });

    // Public verification text
    page.drawText("SCAN QR TO VERIFY DONOR", {
      x: 19,
      y: 38,
      size: 6.5,
      font: boldFont,
      color: green,
    });

    // Token / card identifier
    page.drawText(
      `DONOR ID: ${donor.id}`,
      {
        x: 19,
        y: 25,
        size: 6.5,
        font: regularFont,
        color: mutedText,
      }
    );

    // --------------------------------------------------
    // SAVE PDF
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