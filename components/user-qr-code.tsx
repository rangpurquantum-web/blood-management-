"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  Loader2,
  Download,
  Printer,
  RotateCw,
  FileDown,
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

export function UserQrCode({ userId, userName }: UserQrCodeProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ─────────────────────────────────────────────
  // Load QR from server
  // ─────────────────────────────────────────────
  async function loadQr() {
    setLoading(true);
    setDataUrl(null);

    try {
      const res = await fetch(`/api/users/${userId}/qr`, {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) {
        throw new Error("Failed to load QR");
      }

      const data = await res.json();

      if (!data?.token) {
        throw new Error("QR token not found");
      }

      // Canvas render হওয়ার জন্য ছোট delay
      await new Promise((resolve) => setTimeout(resolve, 50));

      await renderQr(data.token);
    } catch (error) {
      console.error("QR load error:", error);
      toast.error("QR কোড লোড করা যায়নি");
    } finally {
      setLoading(false);
    }
  }

  // ─────────────────────────────────────────────
  // Render QR
  // ─────────────────────────────────────────────
  async function renderQr(token: string) {
    const canvas = canvasRef.current;

    if (!canvas) {
      throw new Error("QR canvas not ready");
    }

    await QRCode.toCanvas(canvas, token, {
      width: 320,
      margin: 4,
      errorCorrectionLevel: "H",
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    });

    const generatedDataUrl = canvas.toDataURL("image/png");

    setDataUrl(generatedDataUrl);
  }

  // ─────────────────────────────────────────────
  // Download QR PNG
  // ─────────────────────────────────────────────
  async function handleDownload() {
    if (!dataUrl) {
      toast.error("QR কোড প্রস্তুত নয়");
      return;
    }

    const safeName =
      userName
        .trim()
        .replace(/[^\p{L}\p{N}]+/gu, "-")
        .replace(/^-+|-+$/g, "")
        .toLowerCase() || "user";

    const fileName = `${safeName}-login-qr.png`;

    try {
      // Data URL → Blob
      const response = await fetch(dataUrl);
      const blob = await response.blob();

      // Android / WebView-এর জন্য File share চেষ্টা
      const file = new File([blob], fileName, {
        type: "image/png",
      });

      if (
        typeof navigator !== "undefined" &&
        "canShare" in navigator &&
        navigator.canShare?.({ files: [file] })
      ) {
        await navigator.share({
          files: [file],
          title: `${userName} — Login QR Code`,
        });

        return;
      }

      // Normal browser/PWA download
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = blobUrl;
      link.download = fileName;
      link.style.display = "none";

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => {
        URL.revokeObjectURL(blobUrl);
      }, 1000);

      toast.success("QR কোড ডাউনলোড শুরু হয়েছে");
    } catch (error) {
      console.error("QR download error:", error);

      // শেষ fallback
      try {
        const link = document.createElement("a");
        link.href = dataUrl;
        link.download = fileName;
        link.target = "_blank";
        link.rel = "noopener";

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success("QR কোড ডাউনলোড শুরু হয়েছে");
      } catch {
        toast.error("QR কোড ডাউনলোড করা যায়নি");
      }
    }
  }

  // ─────────────────────────────────────────────
  // Print
  // ─────────────────────────────────────────────
  function handlePrint() {
    if (!dataUrl) {
      toast.error("QR কোড প্রস্তুত নয়");
      return;
    }

    const printWindow = window.open(
      "",
      "_blank",
      "width=600,height=700",
    );

    if (!printWindow) {
      toast.error("Print window খোলা যায়নি");
      return;
    }

    const escapedName = userName
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html lang="bn">
        <head>
          <meta charset="UTF-8" />
          <title>${escapedName} — Login QR</title>

          <style>
            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              padding: 40px 20px;
              text-align: center;
              font-family: Arial, sans-serif;
              background: white;
              color: #111;
            }

            h2 {
              margin-bottom: 25px;
            }

            img {
              width: 320px;
              height: 320px;
              image-rendering: pixelated;
            }

            p {
              margin-top: 25px;
              color: #666;
              font-size: 13px;
            }
          </style>
        </head>

        <body>
          <h2>${escapedName}</h2>

          <img
            src="${dataUrl}"
            alt="Login QR Code"
          />

          <p>
            Quantum Blood Donor Pool — Staff Login QR
          </p>
        </body>
      </html>
    `);

    printWindow.document.close();

    printWindow.onload = () => {
      printWindow.focus();
      printWindow.print();
    };
  }

  // ─────────────────────────────────────────────
  // Regenerate QR
  // ─────────────────────────────────────────────
  async function handleRegenerate() {
    const confirmed = window.confirm(
      "নতুন QR কোড বানালে আগের QR কোড আর কাজ করবে না।\n\nএগোতে চান?",
    );

    if (!confirmed) return;

    setRegenerating(true);

    try {
      const res = await fetch(`/api/users/${userId}/qr`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!res.ok) {
        throw new Error("Failed to regenerate QR");
      }

      const data = await res.json();

      if (!data?.token) {
        throw new Error("New QR token not found");
      }

      await new Promise((resolve) => setTimeout(resolve, 50));

      await renderQr(data.token);

      toast.success("নতুন QR কোড তৈরি হয়েছে");
    } catch (error) {
      console.error("QR regenerate error:", error);
      toast.error("QR কোড রিজেনারেট করা যায়নি");
    } finally {
      setRegenerating(false);
    }
  }

  // ─────────────────────────────────────────────
  // Open / close
  // ─────────────────────────────────────────────
  useEffect(() => {
    if (!open) {
      setDataUrl(null);
      return;
    }

    loadQr();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, userId]);

  // ─────────────────────────────────────────────
  // UI
  // ─────────────────────────────────────────────
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          QR কোড
        </Button>
      </DialogTrigger>

      <DialogContent className="w-[calc(100%-2rem)] max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {userName} — লগইন QR কোড
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">

          {/* QR Preview */}
          <div
            className="
              flex
              min-h-[320px]
              w-full
              max-w-[320px]
              items-center
              justify-center
              overflow-hidden
              rounded-2xl
              border
              bg-white
              p-2
            "
          >
            {loading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />

                <span className="text-sm text-muted-foreground">
                  QR কোড তৈরি হচ্ছে...
                </span>
              </div>
            ) : dataUrl ? (
              <canvas
                ref={canvasRef}
                className="block h-auto w-full max-w-[320px]"
              />
            ) : (
              <span className="text-lg text-muted-foreground">
                QR Code নেই
              </span>
            )}
          </div>

          {/* Buttons */}
          {!loading && dataUrl && (
            <div className="flex w-full flex-col gap-2">

              {/* Download row */}
              <div className="flex gap-2">

                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={handleDownload}
                >
                  <Download className="mr-2 h-4 w-4" />
                  QR ডাউনলোড
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={handlePrint}
                >
                  <Printer className="mr-2 h-4 w-4" />
                  প্রিন্ট
                </Button>

              </div>

              {/* PDF button placeholder */}
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  toast.info(
                    "PDF download চালু করতে jsPDF যোগ করতে হবে।",
                  );
                }}
              >
                <FileDown className="mr-2 h-4 w-4" />
                PDF ডাউনলোড
              </Button>

              {/* Regenerate */}
              <Button
                type="button"
                variant="destructive"
                className="w-full"
                onClick={handleRegenerate}
                disabled={regenerating}
              >
                {regenerating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RotateCw className="mr-2 h-4 w-4" />
                )}

                নতুন QR তৈরি করুন
              </Button>

            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              QR কোড লোড হচ্ছে...
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  );
}