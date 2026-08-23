"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { Camera, Upload, X, Loader2, ScanLine, ImageOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface QrLoginScannerProps {
  onDetected: (token: string) => void;
  disabled?: boolean;
}

export function QrLoginScanner({ onDetected, disabled }: QrLoginScannerProps) {
  const [mode, setMode] = useState<"idle" | "camera">("idle");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewStatus, setPreviewStatus] = useState<
    "idle" | "scanning" | "found" | "not-found"
  >("idle");

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function stopCamera() {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setMode("idle");
  }

  async function startCamera() {
    setCameraError(null);
    setPreviewUrl(null);
    setPreviewStatus("idle");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setMode("camera");
      scanLoop();
    } catch {
      setCameraError("ক্যামেরা চালু করা যায়নি। অনুমতি দিয়েছেন কিনা দেখুন।");
    }
  }

  function scanLoop() {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      rafRef.current = requestAnimationFrame(scanLoop);
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const code = jsQR(imageData.data, imageData.width, imageData.height);

    if (code?.data) {
      stopCamera();
      onDetected(code.data);
      return;
    }

    rafRef.current = requestAnimationFrame(scanLoop);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setCameraError(null);
    setPreviewStatus("scanning");
    setPreviewUrl(URL.createObjectURL(file));

    const img = new Image();
    const reader = new FileReader();

    reader.onload = () => {
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code?.data) {
          setPreviewStatus("found");
          onDetected(code.data);
        } else {
          setPreviewStatus("not-found");
          setCameraError("ছবিতে কোনো QR কোড খুঁজে পাওয়া যায়নি।");
        }
      };
      img.src = reader.result as string;
    };

    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function clearPreview() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setPreviewStatus("idle");
    setCameraError(null);
  }

  useEffect(() => {
    return () => {
      stopCamera();
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col items-center gap-4">
      {mode === "camera" ? (
        <div className="relative w-full max-w-xs overflow-hidden rounded-2xl border border-red-900/20 bg-black shadow-lg shadow-red-950/10">
          <video
            ref={videoRef}
            className="aspect-square w-full object-cover"
            muted
            playsInline
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* scan frame overlay */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative h-[70%] w-[70%]">
              <Corner className="left-0 top-0 border-l-2 border-t-2" />
              <Corner className="right-0 top-0 border-r-2 border-t-2" />
              <Corner className="bottom-0 left-0 border-b-2 border-l-2" />
              <Corner className="bottom-0 right-0 border-b-2 border-r-2" />
              <div className="scan-line absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-red-500 to-transparent" />
            </div>
          </div>

          <div className="absolute inset-x-0 top-0 flex items-center justify-between bg-gradient-to-b from-black/60 to-transparent p-3">
            <span className="flex items-center gap-1.5 text-xs font-medium text-white">
              <ScanLine className="h-3.5 w-3.5" />
              QR কোড স্ক্যান করুন
            </span>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="h-7 w-7 rounded-full"
              onClick={stopCamera}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : previewUrl ? (
        <div className="relative w-full max-w-xs overflow-hidden rounded-2xl border border-red-900/20 bg-muted shadow-lg shadow-red-950/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="আপলোড করা QR কোড"
            className="aspect-square w-full object-contain bg-white"
          />

          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/60 to-transparent p-3">
            <span className="flex items-center gap-1.5 text-xs font-medium text-white">
              {previewStatus === "scanning" && (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  পরীক্ষা করা হচ্ছে...
                </>
              )}
              {previewStatus === "found" && "QR কোড পাওয়া গেছে"}
              {previewStatus === "not-found" && (
                <>
                  <ImageOff className="h-3.5 w-3.5" />
                  QR কোড পাওয়া যায়নি
                </>
              )}
            </span>
            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="h-7 w-7 rounded-full"
              onClick={clearPreview}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex w-full gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1 border-red-900/20 hover:border-red-600/40 hover:bg-red-50 hover:text-red-700"
            disabled={disabled}
            onClick={startCamera}
          >
            <Camera className="mr-2 h-4 w-4" />
            স্ক্যান করুন
          </Button>
          <Button
            type="button"
            variant="outline"
            className="flex-1 border-red-900/20 hover:border-red-600/40 hover:bg-red-50 hover:text-red-700"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            ছবি আপলোড
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      )}

      {cameraError && (
        <p className="text-center text-sm text-destructive">{cameraError}</p>
      )}

      {disabled && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          লগইন হচ্ছে...
        </div>
      )}

      <style jsx>{`
        .scan-line {
          animation: scan 2.2s ease-in-out infinite;
        }
        @keyframes scan {
          0% {
            top: 2%;
            opacity: 0.9;
          }
          50% {
            top: 96%;
            opacity: 0.9;
          }
          51% {
            opacity: 0;
          }
          52% {
            top: 2%;
            opacity: 0.9;
          }
          100% {
            top: 2%;
            opacity: 0.9;
          }
        }
      `}</style>
    </div>
  );
}

function Corner({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "absolute h-6 w-6 rounded-sm border-red-500",
        className,
      )}
    />
  );
}
