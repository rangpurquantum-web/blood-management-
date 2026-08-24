"use client";

import { useRef, useState } from "react";
import jsQR from "jsqr";
import { BarcodeScanner } from "@capacitor-mlkit/barcode-scanning";
import { Camera, Upload, X, Loader2, ImageOff } from "lucide-react";

import { Button } from "@/components/ui/button";

interface QrLoginScannerProps {
  onDetected: (token: string) => void;
  disabled?: boolean;
}

export function QrLoginScanner({ onDetected, disabled }: QrLoginScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewStatus, setPreviewStatus] = useState<
    "idle" | "scanning" | "found" | "not-found"
  >("idle");

  const fileInputRef = useRef<HTMLInputElement>(null);

  async function ensureCameraPermission(): Promise<boolean> {
    const { camera } = await BarcodeScanner.checkPermissions();
    if (camera === "granted" || camera === "limited") return true;
    if (camera === "denied") return false;

    const { camera: requested } = await BarcodeScanner.requestPermissions();
    return requested === "granted" || requested === "limited";
  }

  async function startCamera() {
    setCameraError(null);
    setPreviewUrl(null);
    setPreviewStatus("idle");
    setScanning(true);

    try {
      const hasPermission = await ensureCameraPermission();
      if (!hasPermission) {
        setCameraError(
          "ক্যামেরা পারমিশন দেওয়া হয়নি। ফোনের সেটিংস থেকে অনুমতি দিন।",
        );
        return;
      }

      // প্রথমবার ব্যবহারে Google-এর ML Kit বারকোড স্ক্যানার মডিউল
      // ডিভাইসে ডাউনলোড/ইনস্টল করা না থাকলে এখানে করে নেওয়া হচ্ছে
      const { available } = await BarcodeScanner.isGoogleBarcodeScannerModuleAvailable();
      if (!available) {
        setCameraError("QR স্ক্যানার মডিউল প্রস্তুত করা হচ্ছে, একটু অপেক্ষা করুন...");
        await BarcodeScanner.installGoogleBarcodeScannerModule();
        setCameraError(null);
      }

      // এটা Google-এর নিজস্ব ফুলস্ক্রিন নেটিভ স্ক্যানার UI খুলবে
      // (WebView video element ব্যবহার করে না, তাই আগের বাগটা এড়িয়ে যায়)
      const { barcodes } = await BarcodeScanner.scan();
      const firstBarcode = barcodes[0];

      if (firstBarcode?.rawValue) {
        onDetected(firstBarcode.rawValue);
      } else {
        setCameraError("কোনো QR কোড শনাক্ত করা যায়নি।");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setCameraError(`scan: ${message}`);
    } finally {
      setScanning(false);
    }
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

  return (
    <div className="flex flex-col items-center gap-4">
      {previewUrl ? (
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
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-2 h-4 w-4" />
            upload 
          </Button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

      {cameraError && (
        <p className="text-center text-sm text-destructive">{cameraError}</p>
      )}

      {disabled && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          লগইন হচ্ছে...
        </div>
      )}
    </div>
  );
}
