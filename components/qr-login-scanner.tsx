"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import {
  BarcodeScanner,
  BarcodeFormat,
} from "@capacitor-mlkit/barcode-scanning";
import { Capacitor } from "@capacitor/core";
import {
  Camera,
  Upload,
  X,
  Loader2,
  ImageOff,
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

  const [browserCamera, setBrowserCamera] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const detectedRef = useRef(false);

  const isNative = Capacitor.isNativePlatform();

  // ─────────────────────────────────────────────
  // Stop PWA camera
  // ─────────────────────────────────────────────

  const stopBrowserCamera = useCallback(() => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        track.stop();
      });

      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.pause();
      videoRef.current.srcObject = null;
    }

    setBrowserCamera(false);
  }, []);

  // ─────────────────────────────────────────────
  // Android native permission
  // ─────────────────────────────────────────────

  async function ensureNativeCameraPermission() {
    const { camera } = await BarcodeScanner.checkPermissions();

    if (camera === "granted" || camera === "limited") {
      return true;
    }

    if (camera === "denied") {
      return false;
    }

    const { camera: requested } =
      await BarcodeScanner.requestPermissions();

    return (
      requested === "granted" ||
      requested === "limited"
    );
  }

  // ─────────────────────────────────────────────
  // Android / Native QR scanner
  // ─────────────────────────────────────────────

  async function startNativeQrScanner() {
    setCameraError(null);
    setScanning(true);
    detectedRef.current = false;

    try {
      const permission =
        await ensureNativeCameraPermission();

      if (!permission) {
        setCameraError(
          "ক্যামেরা permission দেওয়া হয়নি। ফোনের Settings থেকে Camera permission দিন।",
        );
        return;
      }

      const { available } =
        await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();

      if (!available) {
        setCameraError(
          "QR Scanner প্রস্তুত করা হচ্ছে...",
        );

        await BarcodeScanner.installGoogleBarcodeScannerModule();

        setCameraError(null);
      }

      // ⭐ শুধু QR CODE
      const { barcodes } = await BarcodeScanner.scan({
        formats: [BarcodeFormat.QrCode],
      });

      const qr = barcodes.find(
        (barcode) =>
          barcode.format === BarcodeFormat.QrCode &&
          !!barcode.rawValue,
      );

      if (qr?.rawValue) {
        onDetected(qr.rawValue);
      } else {
        setCameraError(
          "কোনো QR Code শনাক্ত করা যায়নি।",
        );
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : String(error);

      setCameraError(`scan: ${message}`);
    } finally {
      setScanning(false);
    }
  }

  // ─────────────────────────────────────────────
  // PWA camera
  // ─────────────────────────────────────────────

  async function startBrowserQrScanner() {
    setCameraError(null);
    setScanning(true);
    setBrowserCamera(true);

    detectedRef.current = false;

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          "এই browser camera access support করে না।",
        );
      }

      // Camera requires HTTPS
      if (
        window.location.protocol !== "https:" &&
        window.location.hostname !== "localhost"
      ) {
        throw new Error(
          "Camera ব্যবহার করতে HTTPS প্রয়োজন।",
        );
      }

      const stream =
        await navigator.mediaDevices.getUserMedia({
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
        throw new Error(
          "Camera preview তৈরি করা যায়নি।",
        );
      }

      video.srcObject = stream;
      video.setAttribute("playsinline", "true");
      video.muted = true;

      await video.play();

      scanBrowserFrame();
    } catch (error) {
      stopBrowserCamera();

      const message =
        error instanceof Error
          ? error.message
          : String(error);

      setCameraError(
        `scan: ${message}`,
      );

      setScanning(false);
    }
  }

  // ─────────────────────────────────────────────
  // PWA QR detection using jsQR
  // ─────────────────────────────────────────────

  function scanBrowserFrame() {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) return;

    if (detectedRef.current) return;

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

    const context = canvas.getContext("2d", {
      willReadFrequently: true,
    });

    if (!context) {
      setCameraError(
        "Camera frame পড়া যাচ্ছে না।",
      );

      stopBrowserCamera();
      setScanning(false);

      return;
    }

    context.drawImage(
      video,
      0,
      0,
      width,
      height,
    );

    const imageData = context.getImageData(
      0,
      0,
      width,
      height,
    );

    // ⭐ jsQR = শুধু QR Code
    const qr = jsQR(
      imageData.data,
      imageData.width,
      imageData.height,
      {
        inversionAttempts: "attemptBoth",
      },
    );

    if (qr?.data) {
      detectedRef.current = true;

      stopBrowserCamera();
      setScanning(false);

      onDetected(qr.data);

      return;
    }

    animationFrameRef.current =
      requestAnimationFrame(scanBrowserFrame);
  }

  // ─────────────────────────────────────────────
  // Scan button
  // ─────────────────────────────────────────────

  async function startCamera() {
    if (disabled || scanning) return;

    setCameraError(null);
    setPreviewUrl(null);
    setPreviewStatus("idle");

    if (isNative) {
      // Android / iOS App
      await startNativeQrScanner();
    } else {
      // PWA / Chrome
      await startBrowserQrScanner();
    }
  }

  // ─────────────────────────────────────────────
  // Upload QR image
  // ─────────────────────────────────────────────

  function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>,
  ) {
    const file = e.target.files?.[0];

    if (!file) return;

    setCameraError(null);
    setPreviewStatus("scanning");

    const objectUrl =
      URL.createObjectURL(file);

    setPreviewUrl(objectUrl);

    const img = new Image();
    const reader = new FileReader();

    reader.onload = () => {
      img.onload = () => {
        const canvas =
          document.createElement("canvas");

        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;

        const context =
          canvas.getContext("2d", {
            willReadFrequently: true,
          });

        if (!context) {
          setPreviewStatus("not-found");
          setCameraError(
            "ছবিটি পড়া যায়নি।",
          );
          return;
        }

        context.drawImage(
          img,
          0,
          0,
          canvas.width,
          canvas.height,
        );

        const imageData =
          context.getImageData(
            0,
            0,
            canvas.width,
            canvas.height,
          );

        // ⭐ Upload থেকেও শুধু QR Code
        const qr = jsQR(
          imageData.data,
          imageData.width,
          imageData.height,
          {
            inversionAttempts: "attemptBoth",
          },
        );

        if (qr?.data) {
          setPreviewStatus("found");
          onDetected(qr.data);
        } else {
          setPreviewStatus("not-found");

          setCameraError(
            "ছবিতে কোনো QR Code খুঁজে পাওয়া যায়নি।",
          );
        }
      };

      img.onerror = () => {
        setPreviewStatus("not-found");

        setCameraError(
          "ছবিটি পড়া যায়নি।",
        );
      };

      img.src = reader.result as string;
    };

    reader.onerror = () => {
      setPreviewStatus("not-found");

      setCameraError(
        "ছবিটি পড়া যায়নি।",
      );
    };

    reader.readAsDataURL(file);

    // একই ছবি আবার select করা যাবে
    e.target.value = "";
  }

  // ─────────────────────────────────────────────
  // Clear uploaded image
  // ─────────────────────────────────────────────

  function clearPreview() {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setPreviewUrl(null);
    setPreviewStatus("idle");
    setCameraError(null);
  }

  // ─────────────────────────────────────────────
  // Cleanup
  // ─────────────────────────────────────────────

  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(
          animationFrameRef.current,
        );
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

  // ─────────────────────────────────────────────
  // UI
  // ─────────────────────────────────────────────

  return (
    <div className="flex flex-col items-center gap-4">
      {/* PWA CAMERA */}
      {browserCamera ? (
        <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-red-900/20 bg-black shadow-lg">
          <video
            ref={videoRef}
            className="aspect-square w-full object-cover"
            autoPlay
            muted
            playsInline
          />

          <canvas
            ref={canvasRef}
            className="hidden"
          />

          {/* QR frame */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative h-56 w-56 rounded-2xl border-2 border-white/90">
              <span className="absolute left-0 top-0 h-8 w-8 rounded-tl-xl border-l-4 border-t-4 border-red-500" />

              <span className="absolute right-0 top-0 h-8 w-8 rounded-tr-xl border-r-4 border-t-4 border-red-500" />

              <span className="absolute bottom-0 left-0 h-8 w-8 rounded-bl-xl border-b-4 border-l-4 border-red-500" />

              <span className="absolute bottom-0 right-0 h-8 w-8 rounded-br-xl border-b-4 border-r-4 border-red-500" />

              <div className="absolute left-3 right-3 top-1/2 h-0.5 animate-pulse bg-red-500" />
            </div>
          </div>

          {/* Bottom */}
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/80 to-transparent p-4">
            <div className="flex items-center gap-2 text-sm font-medium text-white">
              <Loader2 className="h-4 w-4 animate-spin" />
              QR Code স্ক্যান করা হচ্ছে...
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
        /* UPLOAD PREVIEW */
        <div className="relative w-full max-w-xs overflow-hidden rounded-2xl border border-red-900/20 bg-muted shadow-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="আপলোড করা QR Code"
            className="aspect-square w-full bg-white object-contain"
          />

          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/60 to-transparent p-3">
            <span className="flex items-center gap-1.5 text-xs font-medium text-white">
              {previewStatus === "scanning" && (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  QR Code পরীক্ষা করা হচ্ছে...
                </>
              )}

              {previewStatus === "found" &&
                "QR Code পাওয়া গেছে"}

              {previewStatus === "not-found" && (
                <>
                  <ImageOff className="h-3.5 w-3.5" />
                  QR Code পাওয়া যায়নি
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
        /* BUTTONS */
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
        <p className="text-center text-sm text-destructive">
          {cameraError}
        </p>
      )}

      {/* Login */}
      {disabled && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          লগইন হচ্ছে...
        </div>
      )}
    </div>
  );
}