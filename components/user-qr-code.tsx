"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

import {
  Loader2,
  Download,
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

export function UserQrCode({
  userId,
  userName,
}: UserQrCodeProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] =
    useState(false);
  const [downloading, setDownloading] =
    useState(false);

  const [dataUrl, setDataUrl] =
    useState<string | null>(null);

  const canvasRef =
    useRef<HTMLCanvasElement>(null);

  // ─────────────────────────────────────────────
  // Load QR
  // ─────────────────────────────────────────────

  async function loadQr() {
    setLoading(true);

    try {
      const res = await fetch(
        `/api/users/${userId}/qr`,
      );

      if (!res.ok) {
        throw new Error("Failed to load QR");
      }

      const { token } = await res.json();

      await renderQr(token);
    } catch {
      toast.error(
        "QR কোড লোড করা যায়নি",
      );
    } finally {
      setLoading(false);
    }
  }

  // ─────────────────────────────────────────────
  // Render QR
  // ─────────────────────────────────────────────

  async function renderQr(token: string) {
    if (!canvasRef.current) return;

    await QRCode.toCanvas(
      canvasRef.current,
      token,
      {
        width: 280,
        margin: 2,

        // QR readability improve
        errorCorrectionLevel: "H",
      },
    );

    setDataUrl(
      canvasRef.current.toDataURL(
        "image/png",
      ),
    );
  }

  // ─────────────────────────────────────────────
  // Regenerate
  // ─────────────────────────────────────────────

  async function handleRegenerate() {
    if (
      !confirm(
        "নতুন QR কোড বানালে আগের QR কোড (প্রিন্ট করা থাকলেও) আর কাজ করবে না। এগোতে চান?",
      )
    ) {
      return;
    }

    setRegenerating(true);

    try {
      const res = await fetch(
        `/api/users/${userId}/qr`,
        {
          method: "POST",
        },
      );

      if (!res.ok) {
        throw new Error(
          "Failed to regenerate",
        );
      }

      const { token } = await res.json();

      await renderQr(token);

      toast.success(
        "নতুন QR কোড তৈরি হয়েছে",
      );
    } catch {
      toast.error(
        "QR কোড রিজেনারেট করা যায়নি",
      );
    } finally {
      setRegenerating(false);
    }
  }

  // ─────────────────────────────────────────────
  // Filename
  // ─────────────────────────────────────────────

  function getFileName() {
    const safeName = userName
      .trim()
      .replace(/[^\p{L}\p{N}]+/gu, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase();

    return `${safeName || "user"}-login-qr.png`;
  }

  // ─────────────────────────────────────────────
  // PNG → Base64
  // ─────────────────────────────────────────────

  function getBase64FromDataUrl(
    url: string,
  ) {
    const commaIndex = url.indexOf(",");

    if (commaIndex === -1) {
      throw new Error(
        "Invalid QR image",
      );
    }

    return url.slice(commaIndex + 1);
  }

  // ─────────────────────────────────────────────
  // Download QR
  // ─────────────────────────────────────────────

  async function handleDownload() {
    if (!dataUrl || downloading) return;

    setDownloading(true);

    const fileName = getFileName();

    try {
      // ═══════════════════════════════════════
      // ANDROID / iOS CAPACITOR APP
      // ═══════════════════════════════════════

      if (Capacitor.isNativePlatform()) {
        const base64 =
          getBase64FromDataUrl(dataUrl);

        /*
         * Save inside App's Documents directory.
         *
         * This is reliable inside Capacitor.
         */
        const result =
          await Filesystem.writeFile({
            path: fileName,
            data: base64,
            directory: Directory.Documents,
          });

        /*
         * Open Android/iOS share/save sheet.
         *
         * User can choose:
         * - Files
         * - Downloads
         * - Drive
         * - WhatsApp
         * - etc.
         */
        await Share.share({
          title: `${userName} — Login QR`,
          text: "Quantum Blood Donor Pool — Login QR Code",
          url: result.uri,
          dialogTitle: "QR Code Save করুন",
        });

        toast.success(
          "QR Code প্রস্তুত হয়েছে",
        );

        return;
      }

      // ═══════════════════════════════════════
      // PWA / NORMAL BROWSER
      // ═══════════════════════════════════════

      const response = await fetch(
        dataUrl,
      );

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
        "QR Code ডাউনলোড হয়েছে",
      );
    } catch (error) {
      console.error(
        "QR download failed:",
        error,
      );

      /*
       * Native share/save fail করলে
       * native browser fallback চেষ্টা করবে।
       */
      try {
        if (Capacitor.isNativePlatform()) {
          await Share.share({
            title: `${userName} — Login QR`,
            text: "Quantum Blood Donor Pool — Login QR Code",
          });

          return;
        }
      } catch {
        // Ignore fallback error
      }

      toast.error(
        "QR Code ডাউনলোড করা যায়নি",
      );
    } finally {
      setDownloading(false);
    }
  }

  // ─────────────────────────────────────────────
  // Print
  // ─────────────────────────────────────────────

  function handlePrint() {
    if (!dataUrl) return;

    const win =
      window.open("", "_blank");

    if (!win) {
      toast.error(
        "Print window খোলা যায়নি",
      );
      return;
    }

    win.document.write(`
      <html>
        <head>
          <title>${userName} — Login QR</title>
        </head>

        <body
          style="
            text-align:center;
            font-family:sans-serif;
            padding:24px;
          "
        >
          <h3>${userName}</h3>

          <img
            src="${dataUrl}"
            style="
              width:280px;
              height:280px;
              image-rendering:auto;
            "
          />

          <p
            style="
              color:#666;
              font-size:12px;
            "
          >
            Quantum Blood Donor Pool —
            Staff Login QR
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

  // ─────────────────────────────────────────────
  // Dialog open
  // ─────────────────────────────────────────────

  useEffect(() => {
    if (open) {
      loadQr();
    } else {
      setDataUrl(null);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // ─────────────────────────────────────────────
  // UI
  // ─────────────────────────────────────────────

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
          {/* Loading */}
          {loading && (
            <div className="flex h-[280px] w-[280px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* QR Canvas */}
          <canvas
            ref={canvasRef}
            className={
              loading
                ? "hidden"
                : "rounded-lg border"
            }
          />

          {/* Buttons */}
          {!loading && (
            <div className="flex w-full flex-col gap-2">
              <div className="flex gap-2">
                {/* Download */}
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleDownload}
                  disabled={
                    !dataUrl ||
                    downloading
                  }
                >
                  {downloading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="mr-2 h-4 w-4" />
                  )}

                  {downloading
                    ? "সেভ হচ্ছে..."
                    : "ডাউনলোড"}
                </Button>

                {/* Print */}
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handlePrint}
                  disabled={!dataUrl}
                >
                  <Printer className="mr-2 h-4 w-4" />
                  প্রিন্ট
                </Button>
              </div>

              {/* Regenerate */}
              <Button
                variant="destructive"
                onClick={
                  handleRegenerate
                }
                disabled={
                  regenerating ||
                  downloading
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