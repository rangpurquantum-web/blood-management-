"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Capacitor, registerPlugin } from "@capacitor/core";
import { jsPDF } from "jspdf";

import {
  Loader2,
  Download,
  FileDown,
  Printer,
  RotateCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import { toast } from "sonner";

interface UserQrCodeProps {
  userId: number;
  userName: string;
}

interface QrFileSaverPlugin {
  saveImage(options: {
    base64: string;
    fileName: string;
  }): Promise<{
    success: boolean;
    uri: string;
    fileName: string;
  }>;

  savePdf(options: {
    base64: string;
    fileName: string;
  }): Promise<{
    success: boolean;
    uri: string;
    fileName: string;
  }>;
}

const QrFileSaver =
  registerPlugin<QrFileSaverPlugin>(
    "QrFileSaver"
  );

export function UserQrCode({
  userId,
  userName,
}: UserQrCodeProps) {
  const [open, setOpen] = useState(false);

  const [loading, setLoading] =
    useState(false);

  const [regenerating, setRegenerating] =
    useState(false);

  const [downloadingQr, setDownloadingQr] =
    useState(false);

  const [downloadingPdf, setDownloadingPdf] =
    useState(false);

  const [dataUrl, setDataUrl] =
    useState<string | null>(null);

  const canvasRef =
    useRef<HTMLCanvasElement>(null);

  // ─────────────────────────────────────────
  // Safe filename
  // ─────────────────────────────────────────

  function safeFileName(name: string) {
    return (
      name
        .trim()
        .replace(/[^\p{L}\p{N}]+/gu, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase() || "user"
    );
  }

  // ─────────────────────────────────────────
  // Load QR
  // ─────────────────────────────────────────

  async function loadQr() {
    setLoading(true);

    try {
      const res = await fetch(
        `/api/users/${userId}/qr`
      );

      if (!res.ok) {
        throw new Error(
          "Failed to load QR"
        );
      }

      const { token } =
        await res.json();

      await renderQr(token);

    } catch {
      toast.error(
        "QR কোড লোড করা যায়নি"
      );
    } finally {
      setLoading(false);
    }
  }

  // ─────────────────────────────────────────
  // Render QR
  // ─────────────────────────────────────────

  async function renderQr(
    token: string
  ) {
    if (!canvasRef.current) return;

    await QRCode.toCanvas(
      canvasRef.current,
      token,
      {
        width: 800,
        margin: 4,
        errorCorrectionLevel: "H",
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      }
    );

    setDataUrl(
      canvasRef.current.toDataURL(
        "image/png"
      )
    );
  }

  // ─────────────────────────────────────────
  // Get base64
  // ─────────────────────────────────────────

  function getBase64(
    dataUrl: string
  ) {
    const comma =
      dataUrl.indexOf(",");

    if (comma === -1) {
      throw new Error(
        "Invalid image data"
      );
    }

    return dataUrl.substring(
      comma + 1
    );
  }

  // ─────────────────────────────────────────
  // Download QR
  // ─────────────────────────────────────────

  async function handleDownloadQr() {
    if (
      !dataUrl ||
      downloadingQr
    ) {
      return;
    }

    setDownloadingQr(true);

    const fileName =
      `${safeFileName(userName)}-login-qr.png`;

    try {

      // ─────────────────────────────
      // Android APK
      // ─────────────────────────────

      if (
        Capacitor.isNativePlatform()
      ) {
        await QrFileSaver.saveImage({
          base64: getBase64(dataUrl),
          fileName,
        });

        toast.success(
          "QR Code Gallery-তে save হয়েছে"
        );

        return;
      }

      // ─────────────────────────────
      // PWA / Browser
      // ─────────────────────────────

      const response =
        await fetch(dataUrl);

      const blob =
        await response.blob();

      const blobUrl =
        URL.createObjectURL(blob);

      const a =
        document.createElement("a");

      a.href = blobUrl;
      a.download = fileName;

      document.body.appendChild(a);

      a.click();

      a.remove();

      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
      }, 1000);

      toast.success(
        "QR Code ডাউনলোড হয়েছে"
      );

    } catch (error) {

      console.error(
        "QR download error:",
        error
      );

      toast.error(
        "QR Code save করা যায়নি"
      );

    } finally {
      setDownloadingQr(false);
    }
  }

  // ─────────────────────────────────────────
  // Download PDF
  // ─────────────────────────────────────────

  async function handleDownloadPdf() {
    if (
      !dataUrl ||
      downloadingPdf
    ) {
      return;
    }

    setDownloadingPdf(true);

    const fileName =
      `${safeFileName(userName)}-login-qr.pdf`;

    try {

      // Create PDF
      const pdf =
        new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4",
        });

      const pageWidth =
        pdf.internal.pageSize.getWidth();

      // Header
      pdf.setFontSize(18);

      pdf.text(
        "Quantum Blood Donor Pool",
        pageWidth / 2,
        25,
        {
          align: "center",
        }
      );

      pdf.setFontSize(14);

      pdf.text(
        "Staff Login QR Code",
        pageWidth / 2,
        35,
        {
          align: "center",
        }
      );

      pdf.setFontSize(13);

      pdf.text(
        userName,
        pageWidth / 2,
        48,
        {
          align: "center",
        }
      );

      // QR
      const qrSize = 70;

      const qrX =
        (pageWidth - qrSize) / 2;

      pdf.addImage(
        dataUrl,
        "PNG",
        qrX,
        60,
        qrSize,
        qrSize
      );

      // Footer
      pdf.setFontSize(9);

      pdf.setTextColor(
        100,
        100,
        100
      );

      pdf.text(
        "Quantum Blood Donor Pool",
        pageWidth / 2,
        145,
        {
          align: "center",
        }
      );

      pdf.text(
        "Use this QR Code for staff login.",
        pageWidth / 2,
        152,
        {
          align: "center",
        }
      );

      // PDF data URL
      const pdfDataUrl =
        pdf.output("datauristring");

      // ─────────────────────────────
      // Android APK
      // ─────────────────────────────

      if (
        Capacitor.isNativePlatform()
      ) {

        await QrFileSaver.savePdf({
          base64:
            getBase64(pdfDataUrl),
          fileName,
        });

        toast.success(
          "PDF Downloads folder-এ save হয়েছে"
        );

        return;
      }

      // ─────────────────────────────
      // PWA / Browser
      // ─────────────────────────────

      pdf.save(fileName);

      toast.success(
        "PDF ডাউনলোড হয়েছে"
      );

    } catch (error) {

      console.error(
        "PDF download error:",
        error
      );

      toast.error(
        "PDF save করা যায়নি"
      );

    } finally {
      setDownloadingPdf(false);
    }
  }

  // ─────────────────────────────────────────
  // Regenerate
  // ─────────────────────────────────────────

  async function handleRegenerate() {
    if (
      !confirm(
        "নতুন QR কোড বানালে আগের QR কোড (প্রিন্ট করা থাকলেও) আর কাজ করবে না। এগোতে চান?"
      )
    ) {
      return;
    }

    setRegenerating(true);

    try {

      const res =
        await fetch(
          `/api/users/${userId}/qr`,
          {
            method: "POST",
          }
        );

      if (!res.ok) {
        throw new Error(
          "Failed to regenerate"
        );
      }

      const { token } =
        await res.json();

      await renderQr(token);

      toast.success(
        "নতুন QR কোড তৈরি হয়েছে"
      );

    } catch {

      toast.error(
        "QR কোড রিজেনারেট করা যায়নি"
      );

    } finally {
      setRegenerating(false);
    }
  }

  // ─────────────────────────────────────────
  // Print
  // ─────────────────────────────────────────

  function handlePrint() {
    if (!dataUrl) return;

    const win =
      window.open(
        "",
        "_blank"
      );

    if (!win) {
      toast.error(
        "Print window খোলা যায়নি"
      );
      return;
    }

    win.document.write(`
      <html>
        <head>
          <title>
            ${userName} — Login QR
          </title>
        </head>

        <body
          style="
            text-align:center;
            font-family:sans-serif;
            padding:24px;
          "
        >

          <h2>
            Quantum Blood Donor Pool
          </h2>

          <h3>
            ${userName}
          </h3>

          <img
            src="${dataUrl}"
            style="
              width:300px;
              height:300px;
            "
          />

          <p
            style="
              color:#666;
              font-size:12px;
            "
          >
            Staff Login QR Code
          </p>

        </body>
      </html>
    `);

    win.document.close();

    win.onload = () => {
      win.focus();
      win.print();
    };
  }

  // ─────────────────────────────────────────
  // Dialog
  // ─────────────────────────────────────────

  useEffect(() => {

    if (open) {
      loadQr();
    } else {
      setDataUrl(null);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
    >

      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
        >
          QR কোড
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-sm">

        <DialogHeader>

          <DialogTitle>
            {userName} — লগইন QR কোড
          </DialogTitle>

        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">

          {loading && (
            <div className="flex h-[280px] w-[280px] items-center justify-center">

              <Loader2
                className="h-8 w-8 animate-spin text-muted-foreground"
              />

            </div>
          )}

          <canvas
            ref={canvasRef}
            className={
              loading
                ? "hidden"
                : "w-[280px] rounded-lg border"
            }
          />

          {!loading && (
            <div className="flex w-full flex-col gap-2">

              {/* Download buttons */}
              <div className="grid grid-cols-2 gap-2">

                {/* PNG */}
                <Button
                  variant="outline"
                  onClick={
                    handleDownloadQr
                  }
                  disabled={
                    !dataUrl ||
                    downloadingQr ||
                    downloadingPdf
                  }
                >

                  {downloadingQr ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}

                  {downloadingQr
                    ? "সেভ হচ্ছে..."
                    : "QR ডাউনলোড"}
                </Button>

                {/* PDF */}
                <Button
                  variant="outline"
                  onClick={
                    handleDownloadPdf
                  }
                  disabled={
                    !dataUrl ||
                    downloadingQr ||
                    downloadingPdf
                  }
                >

                  {downloadingPdf ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <FileDown className="mr-2 h-4 w-4" />
                  )}

                  {downloadingPdf
                    ? "সেভ হচ্ছে..."
                    : "PDF ডাউনলোড"}
                </Button>

              </div>

              {/* Print */}
              <Button
                variant="outline"
                onClick={handlePrint}
                disabled={!dataUrl}
              >

                <Printer className="mr-2 h-4 w-4" />

                প্রিন্ট

              </Button>

              {/* Regenerate */}
              <Button
                variant="destructive"
                onClick={
                  handleRegenerate
                }
                disabled={
                  regenerating ||
                  downloadingQr ||
                  downloadingPdf
                }
              >

                {regenerating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RotateCw className="mr-2 h-4 w-4" />
                )}

                নতুন QR তৈরি করুন
                (আগেরটা বাতিল হবে)

              </Button>

            </div>
          )}

        </div>

      </DialogContent>

    </Dialog>
  );
}