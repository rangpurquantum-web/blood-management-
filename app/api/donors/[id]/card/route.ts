import { NextRequest, NextResponse } from "next/server";
import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";
import { prisma } from "@/lib/db";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const donorId = Number(id);

    if (!Number.isInteger(donorId) || donorId <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid donor ID",
        },
        { status: 400 }
      );
    }

    const donor = await prisma.donor.findFirst({
      where: {
        id: donorId,
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
        {
          success: false,
          error: "Donor not found",
        },
        { status: 404 }
      );
    }

    /*
     * Public donor URL uses the donor's publicToken.
     * Example:
     * https://your-domain.com/d/<publicToken>
     */
    const publicUrl = `${process.env.NEXTAUTH_URL || ""}/d/${donor.publicToken}`;

    const qrDataUrl = await QRCode.toDataURL(publicUrl, {
      width: 300,
      margin: 2,
      errorCorrectionLevel: "M",
    });

    const qrBase64 = qrDataUrl.split(",")[1];

    if (!qrBase64) {
      throw new Error("Failed to generate QR code");
    }

    const qrBytes = Buffer.from(qrBase64, "base64");

    const pdfDoc = await PDFDocument.create();

    const pageWidth = 540;
    const pageHeight = 340;

    const page = pdfDoc.addPage([pageWidth, pageHeight]);

    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const qrImage = await pdfDoc.embedPng(qrBytes);

    /*
     * Background
     */
    page.drawRectangle({
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight,
      color: rgb(0.98, 0.98, 0.98),
    });

    /*
     * Header
     */
    page.drawRectangle({
      x: 0,
      y: pageHeight - 75,
      width: pageWidth,
      height: 75,
      color: rgb(0.75, 0.05, 0.05),
    });

    page.drawText("BLOOD DONOR ID CARD", {
      x: 30,
      y: pageHeight - 42,
      size: 20,
      font: boldFont,
      color: rgb(1, 1, 1),
    });

    page.drawText("Verified Blood Donor", {
      x: 32,
      y: pageHeight - 61,
      size: 10,
      font: regularFont,
      color: rgb(1, 1, 1),
    });

    /*
     * Blood group badge
     */
    page.drawRectangle({
      x: 400,
      y: pageHeight - 65,
      width: 105,
      height: 42,
      color: rgb(1, 1, 1),
      borderColor: rgb(0.9, 0.9, 0.9),
      borderWidth: 1,
    });

    page.drawText(donor.bloodType, {
      x: 423,
      y: pageHeight - 50,
      size: 18,
      font: boldFont,
      color: rgb(0.75, 0.05, 0.05),
    });

    /*
     * Donor information
     */
    const leftX = 30;
    let currentY = pageHeight - 110;

    page.drawText("DONOR INFORMATION", {
      x: leftX,
      y: currentY,
      size: 10,
      font: boldFont,
      color: rgb(0.4, 0.4, 0.4),
    });

    currentY -= 28;

    page.drawText("Name", {
      x: leftX,
      y: currentY,
      size: 9,
      font: regularFont,
      color: rgb(0.45, 0.45, 0.45),
    });

    page.drawText(donor.fullName, {
      x: leftX,
      y: currentY - 15,
      size: 14,
      font: boldFont,
      color: rgb(0.1, 0.1, 0.1),
    });

    currentY -= 52;

    page.drawText("Gender", {
      x: leftX,
      y: currentY,
      size: 9,
      font: regularFont,
      color: rgb(0.45, 0.45, 0.45),
    });

    page.drawText(donor.gender || "N/A", {
      x: leftX,
      y: currentY - 15,
      size: 11,
      font: regularFont,
      color: rgb(0.1, 0.1, 0.1),
    });

    page.drawText("Status", {
      x: 180,
      y: currentY,
      size: 9,
      font: regularFont,
      color: rgb(0.45, 0.45, 0.45),
    });

    page.drawText(donor.isEligible ? "Eligible" : "Deferred", {
      x: 180,
      y: currentY - 15,
      size: 11,
      font: boldFont,
      color: donor.isEligible
        ? rgb(0.05, 0.55, 0.25)
        : rgb(0.8, 0.5, 0.05),
    });

    currentY -= 45;

    const primaryPhone =
      donor.phone.find((phone) => phone.isPrimary) || donor.phone[0];

    page.drawText("Phone", {
      x: leftX,
      y: currentY,
      size: 9,
      font: regularFont,
      color: rgb(0.45, 0.45, 0.45),
    });

    page.drawText(primaryPhone?.number || "N/A", {
      x: leftX,
      y: currentY - 15,
      size: 11,
      font: regularFont,
      color: rgb(0.1, 0.1, 0.1),
    });

    page.drawText("Donor ID", {
      x: 180,
      y: currentY,
      size: 9,
      font: regularFont,
      color: rgb(0.45, 0.45, 0.45),
    });

    page.drawText(String(donor.id), {
      x: 180,
      y: currentY - 15,
      size: 11,
      font: regularFont,
      color: rgb(0.1, 0.1, 0.1),
    });

    /*
     * QR Code
     */
    page.drawText("SCAN TO VIEW DONOR PROFILE", {
      x: 350,
      y: 215,
      size: 8,
      font: boldFont,
      color: rgb(0.4, 0.4, 0.4),
    });

    page.drawImage(qrImage, {
      x: 350,
      y: 75,
      width: 125,
      height: 125,
    });

    /*
     * Footer
     */
    page.drawLine({
      start: {
        x: 30,
        y: 42,
      },
      end: {
        x: pageWidth - 30,
        y: 42,
      },
      thickness: 1,
      color: rgb(0.85, 0.85, 0.85),
    });

    page.drawText(
      "This card identifies the registered blood donor.",
      {
        x: 30,
        y: 25,
        size: 8,
        font: regularFont,
        color: rgb(0.5, 0.5, 0.5),
      }
    );

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="donor-${donor.id}-id-card.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Donor ID card generation error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to generate donor ID card",
      },
      { status: 500 }
    );
  }
}