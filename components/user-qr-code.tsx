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
  X,
  Maximize2,
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

// ─────────────────────────────────────────────────────────────
// Native Android QR file saver
// ─────────────────────────────────────────────────────────────

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
  registerPlugin<QrFileSaverPlugin>("QrFileSaver");

// ─────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────

interface UserQrCodeProps {
  userId: number;
  userName: string;
}

// ─────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────

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

  // Full-screen QR viewer
  const [qrViewerOpen, setQrViewerOpen] =
    useState(false);

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
  // Base64 helper
  // ─────────────────────────────────────────

  function getBase64(dataUrl: string) {
    const comma =
      dataUrl.indexOf(",");

    if (comma === -1) {
      throw new Error(
        "Invalid data URL"
      );
    }

    return dataUrl.substring(
      comma + 1
    );
  }

  // ─────────────────────────────────────────
  // Load QR from server
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

      const data = await res.json();

      if (!data?.token) {
        throw new Error(
          "QR token পাওয়া যায়নি"
        );
      }

      await renderQr(data.token);

    } catch (error) {
      console.error(
        "QR load error:",
        error
      );

      toast.error(
        "QR কোড লোড করা যায়নি"
      );
    } finally {
      setLoading(false);
    }
  }

  // ─────────────────────────────────────────
  // Render QR
  //
  // Actual QR = 400x400
  // Display = 280x280
  //
  // এতে QR sharp থাকবে কিন্তু
  // screen-এ oversized হবে না।
  // ─────────────────────────────────────────

  async function renderQr(token: string) {
    if (!canvasRef.current) return;

    await QRCode.toCanvas(
      canvasRef.current,
      token,
      {
        width: 400,
        margin: 4,
        errorCorrectionLevel: "H",

        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      }
    );

    const url =
      canvasRef.current.toDataURL(
        "image/png"
      );

    setDataUrl(url);
  }

  // ─────────────────────────────────────────
  // Download QR PNG
  // ─────────────────────────────────────────

  async function handleDownloadQr() {
    if (
      !dataUrl ||
      downloadingQr ||
      downloadingPdf
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
  // Generate PDF
  // ─────────────────────────────────────────

  async function handleDownloadPdf() {
    if (
      !dataUrl ||
      downloadingQr ||
      downloadingPdf
    ) {
      return;
    }

    setDownloadingPdf(true);

    const fileName =
      `${safeFileName(userName)}-login-qr.pdf`;

    try {
      const pdf =
        new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4",
        });

      const pageWidth =
        pdf.internal.pageSize.getWidth();

      const pageHeight =
        pdf.internal.pageSize.getHeight();

      // ─────────────────────────────
      // Header
      // ─────────────────────────────

      pdf.setTextColor(
        0,
        0,
        0
      );

      pdf.setFontSize(20);

      pdf.text(
        "Quantum Blood Donor Pool",
        pageWidth / 2,
        28,
        {
          align: "center",
        }
      );

      pdf.setFontSize(15);

      pdf.text(
        "Staff Login QR Code",
        pageWidth / 2,
        39,
        {
          align: "center",
        }
      );

      // ─────────────────────────────
      // User name
      // ─────────────────────────────

      pdf.setFontSize(14);

      pdf.text(
        userName,
        pageWidth / 2,
        52,
        {
          align: "center",
        }
      );

      // ─────────────────────────────
      // QR Code
      // ─────────────────────────────

      const qrSize = 85;

      const qrX =
        (pageWidth - qrSize) / 2;

      pdf.addImage(
        dataUrl,
        "PNG",
        qrX,
        65,
        qrSize,
        qrSize,
        undefined,
        "FAST"
      );

      // ─────────────────────────────
      // Description
      // ─────────────────────────────

      pdf.setTextColor(
        90,
        90,
        90
      );

      pdf.setFontSize(10);

      pdf.text(
        "Scan this QR Code to sign in.",
        pageWidth / 2,
        165,
        {
          align: "center",
        }
      );

      pdf.text(
        "Quantum Blood Donor Pool",
        pageWidth / 2,
        173,
        {
          align: "center",
        }
      );

      // ─────────────────────────────
      // Footer
      // ─────────────────────────────

      pdf.setFontSize(8);

      pdf.setTextColor(
        130,
        130,
        130
      );

      pdf.text(
        "Authorized management personnel only.",
        pageWidth / 2,
        pageHeight - 20,
        {
          align: "center",
        }
      );

      // ─────────────────────────────
      // PDF data
      // ─────────────────────────────

      const pdfDataUrl =
        pdf.output(
          "datauristring"
        );

      // ─────────────────────────────
      // Android APK
      // ─────────────────────────────

      if (
        Capacitor.isNativePlatform()
      ) {
        await QrFileSaver.savePdf({
          base64:
            getBase64(
              pdfDataUrl
            ),
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
  // Regenerate QR
  // ─────────────────────────────────────────

  async function handleRegenerate() {
    const confirmed =
      window.confirm(
        "নতুন QR কোড বানালে আগের QR কোড (প্রিন্ট করা থাকলেও) আর কাজ করবে না। এগোতে চান?"
      );

    if (!confirmed) {
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

      const data =
        await res.json();

      if (!data?.token) {
        throw new Error(
          "New QR token পাওয়া যায়নি"
        );
      }

      await renderQr(
        data.token
      );

      toast.success(
        "নতুন QR কোড তৈরি হয়েছে"
      );

    } catch (error) {
      console.error(
        "QR regenerate error:",
        error
      );

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
    if (!dataUrl) {
      return;
    }

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
      <!DOCTYPE html>

      <html>

        <head>

          <title>
            ${userName} — Login QR
          </title>

          <meta
            name="viewport"
            content="width=device-width, initial-scale=1"
          />

        </head>

        <body
          style="
            margin:0;
            padding:40px;
            text-align:center;
            font-family:Arial,sans-serif;
            background:#ffffff;
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
              width:320px;
              height:320px;
              object-fit:contain;
              image-rendering:pixelated;
            "
          />

          <p
            style="
              color:#666;
              font-size:12px;
              margin-top:20px;
            "
          >
            Staff Login QR Code
          </p>

          <p
            style="
              color:#888;
              font-size:11px;
            "
          >
            Authorized management personnel only.
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
  // Dialog open / close
  // ─────────────────────────────────────────

  useEffect(() => {
    if (open) {
      loadQr();
    } else {
      setDataUrl(null);
      setQrViewerOpen(false);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ─────────────────────────────────────────
  // UI
  // ─────────────────────────────────────────

  return (
    <>
      {/* =====================================================
          MAIN QR DIALOG
      ====================================================== */}

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

        <DialogContent
          className="w-[calc(100%-2rem)] max-w-sm"
        >

          <DialogHeader>
            <DialogTitle>
              {userName} — লগইন QR কোড
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4 py-2">

            {/* =================================================
                QR PREVIEW
            ================================================== */}

            {loading ? (
              <div
                className="
                  flex
                  h-[280px]
                  w-[280px]
                  items-center
                  justify-center
                  rounded-xl
                  border
                  bg-white
                "
              >
                <Loader2
                  className="
                    h-8
                    w-8
                    animate-spin
                    text-muted-foreground
                  "
                />
              </div>
            ) : dataUrl ? (
              <button
                type="button"
                onClick={() =>
                  setQrViewerOpen(true)
                }
                className="
                  group
                  relative
                  flex
                  h-[280px]
                  w-[280px]
                  items-center
                  justify-center
                  overflow-hidden
                  rounded-xl
                  border
                  bg-white
                  p-0
                  shadow-sm
                  focus:outline-none
                  focus:ring-2
                  focus:ring-red-500
                "
                aria-label="QR Code বড় করে দেখুন"
              >

                <img
                  src={dataUrl}
                  alt={`${userName} Login QR Code`}
                  className="
                    h-[280px]
                    w-[280px]
                    object-contain
                    bg-white
                    p-1
                    [image-rendering:pixelated]
                  "
                />

                {/* Hover / tap overlay */}
                <span
                  className="
                    absolute
                    bottom-2
                    right-2
                    flex
                    items-center
                    gap-1
                    rounded-full
                    bg-black/65
                    px-2.5
                    py-1.5
                    text-xs
                    font-medium
                    text-white
                    opacity-0
                    transition-opacity
                    group-hover:opacity-100
                  "
                >
                  <Maximize2
                    className="h-3.5 w-3.5"
                  />

                  বড় করে দেখুন
                </span>

              </button>
            ) : (
              <div
                className="
                  flex
                  h-[280px]
                  w-[280px]
                  items-center
                  justify-center
                  rounded-xl
                  border
                  bg-white
                "
              >
                <span className="text-sm text-muted-foreground">
                  QR Code নেই
                </span>
              </div>
            )}

            {/* =================================================
                BUTTONS
            ================================================== */}

            {!loading && (
              <div className="flex w-full flex-col gap-2">

                {/* Download row */}

                <div className="grid grid-cols-2 gap-2">

                  {/* PNG */}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={
                      handleDownloadQr
                    }
                    disabled={
                      !dataUrl ||
                      downloadingQr ||
                      downloadingPdf ||
                      regenerating
                    }
                  >

                    {downloadingQr ? (
                      <Loader2
                        className="
                          mr-2
                          h-4
                          w-4
                          animate-spin
                        "
                      />
                    ) : (
                      <Download
                        className="
                          mr-2
                          h-4
                          w-4
                        "
                      />
                    )}

                    {downloadingQr
                      ? "সেভ হচ্ছে..."
                      : "QR ডাউনলোড"}

                  </Button>

                  {/* PDF */}

                  <Button
                    type="button"
                    variant="outline"
                    onClick={
                      handleDownloadPdf
                    }
                    disabled={
                      !dataUrl ||
                      downloadingQr ||
                      downloadingPdf ||
                      regenerating
                    }
                  >

                    {downloadingPdf ? (
                      <Loader2
                        className="
                          mr-2
                          h-4
                          w-4
                          animate-spin
                        "
                      />
                    ) : (
                      <FileDown
                        className="
                          mr-2
                          h-4
                          w-4
                        "
                      />
                    )}

                    {downloadingPdf
                      ? "সেভ হচ্ছে..."
                      : "PDF ডাউনলোড"}

                  </Button>

                </div>

                {/* Print */}

                <Button
                  type="button"
                  variant="outline"
                  onClick={
                    handlePrint
                  }
                  disabled={
                    !dataUrl ||
                    downloadingQr ||
                    downloadingPdf
                  }
                >

                  <Printer
                    className="
                      mr-2
                      h-4
                      w-4
                    "
                  />

                  প্রিন্ট

                </Button>

                {/* Regenerate */}

                <Button
                  type="button"
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
                    <Loader2
                      className="
                        mr-2
                        h-4
                        w-4
                        animate-spin
                      "
                    />
                  ) : (
                    <RotateCw
                      className="
                        mr-2
                        h-4
                        w-4
                      "
                    />
                  )}

                  {regenerating
                    ? "তৈরি হচ্ছে..."
                    : "নতুন QR তৈরি করুন"}

                </Button>

              </div>
            )}

          </div>
        </DialogContent>
      </Dialog>

      {/* =====================================================
          FULL SCREEN QR VIEWER
      ====================================================== */}

      {qrViewerOpen && dataUrl && (
        <div
          className="
            fixed
            inset-0
            z-[9999]
            flex
            items-center
            justify-center
            bg-black/95
            p-4
          "
          role="dialog"
          aria-modal="true"
          aria-label="QR Code Viewer"
          onClick={() =>
            setQrViewerOpen(false)
          }
        >

          {/* Close button */}

          <button
            type="button"
            onClick={() =>
              setQrViewerOpen(false)
            }
            className="
              absolute
              right-4
              top-4
              z-10
              flex
              h-10
              w-10
              items-center
              justify-center
              rounded-full
              bg-white/15
              text-white
              backdrop-blur
              transition
              hover:bg-white/25
            "
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>

          {/* QR container */}

          <div
            className="
              flex
              max-h-[90vh]
              max-w-[95vw]
              flex-col
              items-center
              justify-center
            "
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div
              className="
                rounded-2xl
                bg-white
                p-3
                shadow-2xl
              "
            >

              <img
                src={dataUrl}
                alt={`${userName} QR Code`}
                className="
                  block
                  max-h-[75vh]
                  max-w-[90vw]
                  w-auto
                  h-auto
                  object-contain
                  [image-rendering:pixelated]
                "
              />

            </div>

            <div
              className="
                mt-4
                text-center
                text-white
              "
            >

              <p className="text-base font-semibold">
                {userName}
              </p>

              <p className="mt-1 text-xs text-white/70">
                Quantum Blood Donor Pool
              </p>

            </div>

          </div>

        </div>
      )}
    </>
  );
}