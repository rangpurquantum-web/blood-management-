"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { BarcodeScanner } from "@capacitor-mlkit/barcode-scanning";
import { Capacitor } from "@capacitor/core";
import {
  Camera,
  Upload,
  X,
  Loader2,
  ImageOff,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/components/ui/button";

interface QrLoginScannerProps {
  onDetected: (token: string) => void;
  disabled?: boolean;
}

export function QrLoginScanner({
  onDetected,
  disabled,
}: QrLoginScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewStatus, setPreviewStatus] = useState<
    "idle" | "scanning" | "found" | "not-found"
  >("idle");

  const [isBrowserCamera, setIsBrowserCamera] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Browser camera refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const detectedRef = useRef(false);

  const isNative = Capacitor.isNativePlatform();

  // ─────────────────────────────────────────────────────────────
  // Stop browser camera
  // ─────────────────────────────────────────────────────────────

  const stopBrowserCamera = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }

    setIsBrowserCamera(false);
  }, []);

  // ─────────────────────────────────────────────────────────────
  // Native Android / iOS scanner
  // ─────────────────────────────────────────────────────────────

  async function ensureNativeCameraPermission(): Promise<boolean> {
    const { camera } = await BarcodeScanner.checkPermissions();

    if (camera === "granted" || camera === "limited") {
      return true;
    }

    if (camera === "denied") {
      return false;
    }

    const { camera: requested } =
      await BarcodeScanner.requestPermissions();

    return requested === "granted" || requested === "limited";
  }

  async function startNativeScanner() {
    setCameraError(null);
    setPreviewUrl(null);
    setPreviewStatus("idle");
    setScanning(true);
    detectedRef.current = false;

    try {
      const hasPermission = await ensureNativeCameraPermission();

      if (!hasPermission) {
        setCameraError(
          "ক্যামেরা পারমিশন দেওয়া হয়নি। ফোনের Settings থেকে Camera permission দিন।",
        );
        return;
      }

      const { available } =
        await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();

      if (!available) {
        setCameraError(
          "QR স্ক্যানার মডিউল প্রস্তুত করা হচ্ছে, একটু অপেক্ষা করুন...",
        );

        await BarcodeScanner.installGoogleBarcodeScannerModule();

        setCameraError(null);
      }

      const { barcodes } = await BarcodeScanner.scan();

      const firstBarcode = barcodes[0];

      if (firstBarcode?.rawValue) {
        onDetected(firstBarcode.rawValue);
      } else {
        setCameraError("কোনো QR কোড শনাক্ত করা যায়নি।");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : String(err);

      setCameraError(`scan: ${message}`);
    } finally {
      setScanning(false);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Browser / PWA QR scanner
  // ─────────────────────────────────────────────────────────────

  async function startBrowserScanner() {
    setCameraError(null);
    setPreviewUrl(null);
    setPreviewStatus("idle");
    setScanning(true);
    setIsBrowserCamera(true);

    detectedRef.current = false;

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          "এই browser-এ camera access support করা হয় না।",
        );
      }

      // PWA/browser camera সাধারণত HTTPS ছাড়া কাজ করবে না
      if (
        window.location.protocol !== "https:" &&
        window.location.hostname !== "localhost"
      ) {
        throw new Error(
          "Camera ব্যবহার করতে HTTPS connection প্রয়োজন।",
        );
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: {
            ideal: "environment",
          },
          width: {
            ideal: 1280,
          },
          height: {
            ideal: 720,
          },
        },
        audio: false,
      });

      streamRef.current = stream;

      const video = videoRef.current;

      if (!video) {
        throw new Error("Camera preview তৈরি করা যায়নি।");
      }

      video.srcObject = stream;
      video.setAttribute("playsinline", "true");
      video.muted = true;

      await video.play();

      scanBrowserFrame();
    } catch (err) {
      stopBrowserCamera();

      const message =
        err instanceof Error ? err.message : String(err);

      if (
        message.toLowerCase().includes("permission") ||
        message.toLowerCase().includes("notallowed")
      ) {
        setCameraError(
          "ক্যামেরা permission দেওয়া হয়নি। Browser settings থেকে Camera permission দিন।",
        );
      } else {
        setCameraError(`scan: ${message}`);
      }

      setScanning(false);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Browser QR frame scanner
  // ─────────────────────────────────────────────────────────────

  function scanBrowserFrame() {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) {
      return;
    }

    if (detectedRef.current) {
      return;
    }

    if (video.readyState < 2) {
      animationFrameRef.current =
        requestAnimationFrame(scanBrowserFrame);

      return;
    }

    const width = video.videoWidth;
    const height = video.videoHeight;

    if (!width || !height) {
      animationFrameRef.current =
        requestAnimationFrame(scanBrowserFrame);

      return;
    }

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d", {
      willReadFrequently: true,
    });

    if (!ctx) {
      setCameraError("Camera frame পড়া যাচ্ছে না।");
      stopBrowserCamera();
      setScanning(false);
      return;
    }

    ctx.drawImage(video, 0, 0, width, height);

    const imageData = ctx.getImageData(
      0,
      0,
      width,
      height,
    );

    const code = jsQR(
      imageData.data,
      imageData.width,
      imageData.height,
      {
        inversionAttempts: "attemptBoth",
      },
    );

    if (code?.data) {
      detectedRef.current = true;

      stopBrowserCamera();
      setScanning(false);
      setIsBrowserCamera(false);

      onDetected(code.data);

      return;
    }

    animationFrameRef.current =
      requestAnimationFrame(scanBrowserFrame);
  }

  // ─────────────────────────────────────────────────────────────
  // Main scan button
  // ─────────────────────────────────────────────────────────────

  async function startCamera() {
    if (disabled || scanning) return;

    setCameraError(null);

    if (isNative) {
      // Android / iOS Capacitor app
      await startNativeScanner();
    } else {
      // Chrome / PWA / normal browser
      await startBrowserScanner();
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Upload QR image
  // ─────────────────────────────────────────────────────────────

  function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
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

        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        const ctx = canvas.getContext("2d", {
          willReadFrequently: true,
        });

        if (!ctx) {
          setPreviewStatus("not-found");
          setCameraError("ছবিটি পড়া যায়নি।");
          return;
        }

        ctx.drawImage(
          img,
          0,
          0,
          canvas.width,
          canvas.height,
        );

        const imageData = ctx.getImageData(
          0,
          0,
          canvas.width,
          canvas.height,
        );

        const code = jsQR(
          imageData.data,
          imageData.width,
          imageData.height,
          {
            inversionAttempts: "attemptBoth",
          },
        );

        if (code?.data) {
          setPreviewStatus("found");
          onDetected(code.data);
        } else {
          setPreviewStatus("not-found");
          setCameraError(
            "ছবিতে কোনো QR কোড খুঁজে পাওয়া যায়নি।",
          );
        }
      };

      img.onerror = () => {
        setPreviewStatus("not-found");
        setCameraError("ছবিটি পড়া যায়নি।");
      };

      img.src = reader.result as string;
    };

    reader.onerror = () => {
      setPreviewStatus("not-found");
      setCameraError("ছবিটি পড়া যায়নি।");
    };

    reader.readAsDataURL(file);

    // Same image আবার select করতে পারার জন্য
    e.target.value = "";
  }

  // ─────────────────────────────────────────────────────────────
  // Clear uploaded preview
  // ─────────────────────────────────────────────────────────────

  function clearPreview() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setPreviewUrl(null);
    setPreviewStatus("idle");
    setCameraError(null);
  }

  // ─────────────────────────────────────────────────────────────
  // Stop camera on unmount
  // ─────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      if (streamRef.current) {
        streamRef.current
          .getTracks()
          .forEach((track) => track.stop());
      }

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  // ─────────────────────────────────────────────────────────────
  // UI
  // ─────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col items-center gap-4">
      {/* ─────────────────────────────────────────────
          PWA Browser Camera
      ───────────────────────────────────────────── */}

      {isBrowserCamera ? (
        <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-red-900/20 bg-black shadow-lg">
          <video
            ref={videoRef}
            className="aspect-square w-full object-cover"
            autoPlay
            muted
            playsInline
          />

          {/* Hidden processing canvas */}
          <canvas
            ref={canvasRef}
            className="hidden"
          />

          {/* QR scanning frame */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative h-56 w-56 rounded-2xl border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]">
              {/* corners */}
              <span className="absolute left-0 top-0 h-7 w-7 border-l-4 border-t-4 border-red-500 rounded-tl-xl" />
              <span className="absolute right-0 top-0 h-7 w-7 border-r-4 border-t-4 border-red-500 rounded-tr-xl" />
              <span className="absolute bottom-0 left-0 h-7 w-7 border-b-4 border-l-4 border-red-500 rounded-bl-xl" />
              <span className="absolute bottom-0 right-0 h-7 w-7 border-b-4 border-r-4 border-red-500 rounded-br-xl" />

              {/* scanning line */}
              <div className="absolute left-3 right-3 top-1/2 h-0.5 animate-pulse bg-red-500" />
            </div>
          </div>

          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/80 to-transparent p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <Loader2 className="h-4 w-4 animate-spin" />
              QR কোড স্ক্যান করা হচ্ছে...
            </div>

            <Button
              type="button"
              variant="secondary"
              size="icon"
              className="h-9 w-9 rounded-full"
              onClick={() => {
                stopBrowserCamera();
                setScanning(false);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ) : previewUrl ? (
        // ─────────────────────────────────────────────
        // Uploaded image preview
        // ─────────────────────────────────────────────

        <div className="relative w-full max-w-xs overflow-hidden rounded-2xl border border-red-900/20 bg-muted shadow-lg shadow-red-950/10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="আপলোড করা QR কোড"
            className="aspect-square w-full bg-white object-contain"
          />

          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/60 to-transparent p-3">
            <span className="flex items-center gap-1.5 text-xs font-medium text-white">
              {previewStatus === "scanning" && (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  পরীক্ষা করা হচ্ছে...
                </>
              )}

              {previewStatus === "found" && (
                "QR কোড পাওয়া গেছে"
              )}

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
        // ─────────────────────────────────────────────
        // Scan / Upload buttons
        // ─────────────────────────────────────────────

        <div className="flex w-full gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1 border-red-900/20 hover:border-red-600/40 hover:bg-red-50 hover:text-red-700"
            disabled={disabled || scanning}
            onClick={startCamera}
          >
            {scanning ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Camera className="mr-2 h-4 w-4" />
            )}

            scan
          </Button>

          <Button
            type="button"
            variant="outline"
            className="flex-1 border-red-900/20 hover:border-red-600/40 hover:bg-red-50 hover:text-red-700"
            disabled={disabled || scanning}
            onClick={() =>
              fileInputRef.current?.click()
            }
          >
            <Upload className="mr-2 h-4 w-4" />
            upload
          </Button>
        </div>
      )}

      {/* File input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Error */}
      {cameraError && (
        <div className="flex flex-col items-center gap-2">
          <p className="text-center text-sm text-destructive">
            {cameraError}
          </p>

          {!isBrowserCamera &&
            !isNative &&
            cameraError.toLowerCase().includes("camera") && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={startCamera}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                আবার চেষ্টা করুন
              </Button>
            )}
        </div>
      )}

      {/* Login loading */}
      {disabled && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          লগইন হচ্ছে...
        </div>
      )}
    </div>
  );
}