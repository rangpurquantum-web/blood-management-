import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";
import fs from "fs";
import path from "path";
import { prisma } from "@/lib/db";
import { withAuth } from "@/lib/api-helpers";

// Place the logo file here: public/assets/logo-watermark.png
const LOGO_PATH = path.join(
  process.cwd(),
  "public",
  "assets",
  "logo-watermark.png"
);

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
      color: {
        dark: "#1a1a1a",
        light: "#ffffff",
      },
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

    // Standard ID card size (landscape, scaled up for detail)
    // 85.60mm × 53.98mm ratio, sized in points
    const cardWidth = 486;
    const cardHeight = 270;

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

    const headerRedLight = rgb(0.769, 0.118, 0.184); // #C41E2F
    const red = rgb(0.769, 0.118, 0.184); // #C41E2F
    const dark = rgb(0.102, 0.102, 0.102); // #1A1A1A
    const gray = rgb(0.478, 0.478, 0.478); // #7A7A7A
    const dividerPink = rgb(0.851, 0.604, 0.631); // #D99AA1
    const cardBg = rgb(0.984, 0.980, 0.976); // #FBFAF9
    const white = rgb(1, 1, 1);

    const headerHeight = 48;

    // --------------------------------------------------
    // Background
    // --------------------------------------------------

    page.drawRectangle({
      x: 0,
      y: 0,
      width: cardWidth,
      height: cardHeight,
      color: cardBg,
    });

    // --------------------------------------------------
    // Faded logo watermark, drawn behind everything else
    // Fully contained within the body area (below the header)
    // --------------------------------------------------

    const bodyHeight = cardHeight - headerHeight;
    const bodyCenterX = cardWidth / 2;
    const bodyCenterY = bodyHeight / 2;

    if (fs.existsSync(LOGO_PATH)) {
      const logoBytes = fs.readFileSync(LOGO_PATH);
      const logoImage = await pdfDoc.embedPng(logoBytes);

      // Sized to comfortably fit inside the body without touching the header
      const watermarkSize = Math.min(bodyHeight, cardWidth) * 0.85;

      page.drawImage(logoImage, {
        x: bodyCenterX - watermarkSize / 2,
        y: bodyCenterY - watermarkSize / 2,
        width: watermarkSize,
        height: watermarkSize,
        opacity: 0.07,
      });
    }

    // Faint diagonal accent, bottom-right corner
    page.drawSvgPath(
      `M ${cardWidth} 0 L ${cardWidth} 140 L ${cardWidth - 140} 0 Z`,
      {
        color: red,
        opacity: 0.05,
      }
    );

    // --------------------------------------------------
    // Header band (single solid color — no seams)
    // --------------------------------------------------

    page.drawRectangle({
      x: 0,
      y: cardHeight - headerHeight,
      width: cardWidth,
      height: headerHeight,
      color: headerRedLight,
    });

    page.drawText(
      "QUANTUM VOLUNTARY BLOOD DONATION PROGRAMME",
      {
        x: 22,
        y: cardHeight - headerHeight / 2 - 6,
        size: 13,
        font: boldFont,
        color: white,
      }
    );

    // --------------------------------------------------
    // Large Blood Group mark ("A" + custom plus sign)
    // --------------------------------------------------

    const bloodGroupLetters = donor.bloodType.replace(/[+-]/g, "");
    const isPositive = donor.bloodType.includes("+");

    const letterX = 22;
    const letterBaselineY = 150;

    page.drawText(bloodGroupLetters, {
      x: letterX,
      y: letterBaselineY,
      size: 68,
      font: boldFont,
      color: red,
    });

    if (isPositive) {
      // Draw a plus sign out of two rectangles, next to the letter
      const plusX = letterX + boldFont.widthOfTextAtSize(bloodGroupLetters, 68) + 6;
      const plusY = letterBaselineY + 18;
      const barLength = 30;
      const barThickness = 11;

      // Horizontal bar
      page.drawRectangle({
        x: plusX,
        y: plusY + (barLength - barThickness) / 2,
        width: barLength,
        height: barThickness,
        color: red,
      });

      // Vertical bar
      page.drawRectangle({
        x: plusX + (barLength - barThickness) / 2,
        y: plusY,
        width: barThickness,
        height: barLength,
        color: red,
      });
    }

    // --------------------------------------------------
    // Donor Information (Name / DOB / Donor ID)
    // --------------------------------------------------

    const infoX = 22;
    let cursorY = 118;

    const drawField = (label: string, value: string, valueSize = 16) => {
      page.drawText(label.toUpperCase(), {
        x: infoX,
        y: cursorY,
        size: 8,
        font: boldFont,
        color: gray,
      });

      page.drawText(value, {
        x: infoX,
        y: cursorY - 18,
        size: valueSize,
        font: boldFont,
        color: dark,
      });

      // Divider line beneath the field
      page.drawLine({
        start: { x: infoX, y: cursorY - 27 },
        end: { x: infoX + 260, y: cursorY - 27 },
        thickness: 0.8,
        color: dividerPink,
      });

      cursorY -= 38;
    };

    drawField("Name", donor.fullName);

    drawField(
      "Date of Birth",
      donor.dob ? donor.dob.toLocaleDateString("en-GB") : "N/A"
    );

    // Donor ID (last field, no divider needed after it)
    page.drawText("DONOR ID", {
      x: infoX,
      y: cursorY,
      size: 8,
      font: boldFont,
      color: gray,
    });

    page.drawText(String(donor.id), {
      x: infoX,
      y: cursorY - 18,
      size: 16,
      font: boldFont,
      color: dark,
    });

    // --------------------------------------------------
    // QR Code, boxed top-right
    // --------------------------------------------------

    const qrImage = await pdfDoc.embedPng(qrBytes);

    const qrBoxSize = 130;
    const qrBoxX = cardWidth - qrBoxSize - 20;
    const qrBoxY = cardHeight - headerHeight - qrBoxSize - 18;
    const qrPadding = 9;

    // White backing box with red border
    page.drawRectangle({
      x: qrBoxX,
      y: qrBoxY,
      width: qrBoxSize,
      height: qrBoxSize,
      color: white,
      borderColor: red,
      borderWidth: 1.5,
    });

    page.drawImage(qrImage, {
      x: qrBoxX + qrPadding,
      y: qrBoxY + qrPadding,
      width: qrBoxSize - qrPadding * 2,
      height: qrBoxSize - qrPadding * 2,
    });

    // --------------------------------------------------
    // Footer: branch name + "if found, please return" note
    // --------------------------------------------------

    const footerY = 14;

    page.drawText("QUANTUM FOUNDATION — RANGPUR BRANCH", {
      x: infoX,
      y: footerY,
      size: 7.5,
      font: boldFont,
      color: gray,
    });

    page.drawText(
      "If found, please return this card to the nearest Quantum Foundation office.",
      {
        x: infoX,
        y: footerY - 9,
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