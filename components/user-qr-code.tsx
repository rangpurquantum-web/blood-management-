"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Loader2, Download, Printer, RotateCw } from "lucide-react";

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

  async function loadQr() {
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${userId}/qr`);
      if (!res.ok) throw new Error("Failed to load QR");
      const { token } = await res.json();
      await renderQr(token);
    } catch {
      toast.error("QR কোড লোড করা যায়নি");
    } finally {
      setLoading(false);
    }
  }

  async function renderQr(token: string) {
    if (!canvasRef.current) return;
    await QRCode.toCanvas(canvasRef.current, token, { width: 280, margin: 2 });
    setDataUrl(canvasRef.current.toDataURL("image/png"));
  }

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
      const res = await fetch(`/api/users/${userId}/qr`, { method: "POST" });
      if (!res.ok) throw new Error("Failed to regenerate");
      const { token } = await res.json();
      await renderQr(token);
      toast.success("নতুন QR কোড তৈরি হয়েছে");
    } catch {
      toast.error("QR কোড রিজেনারেট করা যায়নি");
    } finally {
      setRegenerating(false);
    }
  }

  async function handleDownload() {
    if (!dataUrl) return;

    const fileName = `${userName.replace(/\s+/g, "-").toLowerCase()}-login-qr.png`;

    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], fileName, { type: "image/png" });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `${userName} — Login QR`,
        });
        return;
      }
    } catch {
      // fall through to plain download below
    }

    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = fileName;
    a.click();
  }

  function handlePrint() {
    if (!dataUrl) return;
    const win = window.open("", "_blank");
    if (!win) return;
    win.document.write(`
      <html>
        <head><title>${userName} — Login QR</title></head>
        <body style="text-align:center; font-family: sans-serif; padding: 24px;">
          <h3>${userName}</h3>
          <img src="${dataUrl}" style="width:280px;height:280px;" />
          <p style="color:#666;font-size:12px;">Quantum Blood Donor Pool — Staff Login QR</p>
        </body>
      </html>
    `);
    win.document.close();
    win.onload = () => {
      win.focus();
      win.print();
    };
  }

  useEffect(() => {
    if (open) {
      loadQr();
    } else {
      setDataUrl(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          QR কোড
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{userName} — লগইন QR কোড</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-2">
          {loading && (
            <div className="flex h-[280px] w-[280px] items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
          <canvas
            ref={canvasRef}
            className={loading ? "hidden" : "rounded-lg border"}
          />

          {!loading && (
            <div className="flex w-full flex-col gap-2">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleDownload}
                >
                  <Download className="mr-2 h-4 w-4" />
                  ডাউনলোড
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handlePrint}
                >
                  <Printer className="mr-2 h-4 w-4" />
                  প্রিন্ট
                </Button>
              </div>
              <Button
                variant="destructive"
                onClick={handleRegenerate}
                disabled={regenerating}
              >
                {regenerating ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RotateCw className="mr-2 h-4 w-4" />
                )}
                নতুন QR তৈরি করুন (আগেরটা বাতিল হবে)
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}