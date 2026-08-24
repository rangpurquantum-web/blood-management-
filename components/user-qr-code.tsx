"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { registerPlugin, Capacitor } from "@capacitor/core";
import {
  Loader2,
  Printer,
  RotateCw,
  FileDown,
  ImageDown,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";

import { toast } from "sonner";

interface UserQrCodeProps {
  userId: number;
  userName: string;
}

interface QrFileSaverPlugin {
  savePng(options: {
    base64: string;
    fileName: string;
  }): Promise<{
    success: boolean;
    uri?: string;
    fileName?: string;
  }>;

  savePdf(options: {
    base64: string;
    fileName: string;
  }): Promise<{
    success: boolean;
    uri?: string;
    fileName?: string;
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

  const [open, setOpen] =
    useState(false);

  const [loading, setLoading] =
    useState(false);

  const [regenerating, setRegenerating] =
    useState(false);

  const [dataUrl, setDataUrl] =
    useState<string | null>(null);

  const [error, setError] =
    useState<string | null>(null);


  // ============================================================
  // SAFE FILE NAME
  // ============================================================

  function makeFileName(
    extension: "png" | "pdf"
  ) {

    const safeName =
      userName
        .trim()
        .replace(/[^\w\s-]/g, "")
        .replace(/\s+/g, "-")
        .toLowerCase();

    return `${
      safeName || "user"
    }-login-qr.${extension}`;
  }


  // ============================================================
  // LOAD QR
  // ============================================================

  async function loadQr() {

    setLoading(true);
    setError(null);
    setDataUrl(null);

    try {

      const res =
        await fetch(
          `/api/users/${userId}/qr`,
          {
            method: "GET",
            credentials: "include",
            cache: "no-store",
            headers: {
              Accept:
                "application/json",
            },
          }
        );


      if (!res.ok) {

        let message =
          `HTTP ${res.status}`;

        try {

          const body =
            await res.json();

          message =
            body?.error ||
            body?.message ||
            message;

        } catch {
          // ignore
        }

        throw new Error(message);
      }


      const body =
        await res.json();


      if (
        !body?.token ||
        typeof body.token !== "string"
      ) {

        throw new Error(
          "API থেকে QR token পাওয়া যায়নি"
        );
      }


      const generatedQr =
        await QRCode.toDataURL(
          body.token,
          {
            width: 900,
            margin: 4,
            errorCorrectionLevel: "H",
            color: {
              dark: "#000000",
              light: "#ffffff",
            },
          }
        );


      setDataUrl(
        generatedQr
      );

    } catch (err) {

      console.error(
        "QR LOAD ERROR:",
        err
      );

      const message =
        err instanceof Error
          ? err.message
          : "Unknown error";

      setError(
        `QR কোড লোড করা যায়নি: ${message}`
      );

      toast.error(
        "QR কোড লোড করা যায়নি"
      );

    } finally {

      setLoading(false);
    }
  }


  // ============================================================
  // REGENERATE
  // ============================================================

  async function handleRegenerate() {

    const confirmed =
      window.confirm(
        "নতুন QR কোড বানালে আগের QR কোড আর কাজ করবে না।\n\nএগোতে চান?"
      );

    if (!confirmed) {
      return;
    }


    setRegenerating(true);
    setError(null);


    try {

      const res =
        await fetch(
          `/api/users/${userId}/qr`,
          {
            method: "POST",
            credentials: "include",
            headers: {
              Accept:
                "application/json",
            },
          }
        );


      const body =
        await res.json()
          .catch(() => null);


      if (!res.ok) {

        throw new Error(
          body?.error ||
          body?.message ||
          `HTTP ${res.status}`
        );
      }


      if (!body?.token) {

        throw new Error(
          "নতুন QR token পাওয়া যায়নি"
        );
      }


      const generatedQr =
        await QRCode.toDataURL(
          body.token,
          {
            width: 900,
            margin: 4,
            errorCorrectionLevel: "H",
            color: {
              dark: "#000000",
              light: "#ffffff",
            },
          }
        );


      setDataUrl(
        generatedQr
      );


      toast.success(
        "নতুন QR কোড তৈরি হয়েছে"
      );

    } catch (err) {

      console.error(
        "QR REGENERATE ERROR:",
        err
      );

      const message =
        err instanceof Error
          ? err.message
          : "Unknown error";


      setError(
        `QR রিজেনারেট করা যায়নি: ${message}`
      );

      toast.error(
        "QR রিজেনারেট করা যায়নি"
      );

    } finally {

      setRegenerating(false);
    }
  }


  // ============================================================
  // GET BASE64
  // ============================================================

  function getBase64(
    dataUrl: string
  ) {

    return dataUrl.replace(
      /^data:image\/png;base64,/,
      ""
    );
  }


  // ============================================================
  // PNG DOWNLOAD
  // ============================================================

  async function handleDownloadPng() {

    if (!dataUrl) {

      toast.error(
        "QR কোড প্রস্তুত হয়নি"
      );

      return;
    }


    const fileName =
      makeFileName("png");


    try {

      // ========================================================
      // ANDROID APK
      // ========================================================

      if (
        Capacitor.isNativePlatform()
      ) {

        const base64 =
          getBase64(dataUrl);


        const result =
          await QrFileSaver.savePng(
            {
              base64,
              fileName,
            }
          );


        if (!result?.success) {

          throw new Error(
            "Native QR saver failed"
          );
        }


        toast.success(
          "QR Code Gallery-তে সংরক্ষণ হয়েছে"
        );

        return;
      }


      // ========================================================
      // WEB / PWA
      // ========================================================

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
      a.style.display = "none";


      document.body.appendChild(a);

      a.click();

      a.remove();


      setTimeout(() => {

        URL.revokeObjectURL(
          blobUrl
        );

      }, 1000);


      toast.success(
        "QR কোড ডাউনলোড হয়েছে"
      );

    } catch (err) {

      console.error(
        "PNG DOWNLOAD ERROR:",
        err
      );

      toast.error(
        "QR কোড সংরক্ষণ করা যায়নি"
      );
    }
  }


  // ============================================================
  // PDF DOWNLOAD
  // ============================================================

  async function handleDownloadPdf() {

    if (!dataUrl) {

      toast.error(
        "QR কোড প্রস্তুত হয়নি"
      );

      return;
    }


    try {

      const { jsPDF } =
        await import("jspdf");


      const pdf =
        new jsPDF({
          orientation: "portrait",
          unit: "mm",
          format: "a4",
        });


      pdf.setFontSize(18);

      pdf.text(
        "Quantum Blood Donor Pool",
        105,
        25,
        {
          align: "center",
        }
      );


      pdf.setFontSize(14);

      pdf.text(
        userName,
        105,
        35,
        {
          align: "center",
        }
      );


      pdf.addImage(
        dataUrl,
        "PNG",
        55,
        50,
        100,
        100
      );


      pdf.setFontSize(10);

      pdf.setTextColor(
        100,
        100,
        100
      );


      pdf.text(
        "Staff Login QR Code",
        105,
        160,
        {
          align: "center",
        }
      );


      const fileName =
        makeFileName("pdf");


      // ========================================================
      // ANDROID
      // ========================================================

      if (
        Capacitor.isNativePlatform()
      ) {

        const pdfData =
          pdf.output(
            "datauristring"
          );


        const pdfBase64 =
          pdfData.replace(
            /^data:application\/pdf;base64,/,
            ""
          );


        const result =
          await QrFileSaver.savePdf(
            {
              base64:
                pdfBase64,
              fileName,
            }
          );


        if (!result?.success) {

          throw new Error(
            "Native PDF saver failed"
          );
        }


        toast.success(
          "PDF Downloads-এ সংরক্ষণ হয়েছে"
        );

        return;
      }


      // ========================================================
      // WEB
      // ========================================================

      pdf.save(
        fileName
      );


      toast.success(
        "PDF ডাউনলোড হয়েছে"
      );

    } catch (err) {

      console.error(
        "PDF ERROR:",
        err
      );

      toast.error(
        "PDF তৈরি/সংরক্ষণ করা যায়নি"
      );
    }
  }


  // ============================================================
  // PRINT
  // ============================================================

  function handlePrint() {

    if (!dataUrl) {

      toast.error(
        "QR কোড প্রস্তুত হয়নি"
      );

      return;
    }


    const printWindow =
      window.open(
        "",
        "_blank",
        "width=600,height=800"
      );


    if (!printWindow) {

      toast.error(
        "Print window খোলা যায়নি"
      );

      return;
    }


    const safeName =
      userName
        .replace(
          /</g,
          "&lt;"
        )
        .replace(
          />/g,
          "&gt;"
        );


    printWindow.document.write(`
      <!DOCTYPE html>

      <html>

        <head>

          <title>
            ${safeName} - Login QR
          </title>

          <style>

            body {
              margin: 0;
              padding: 40px;
              text-align: center;
              font-family: Arial, sans-serif;
              background: white;
            }

            h2 {
              margin-bottom: 8px;
            }

            img {
              width: 280px;
              height: 280px;
              image-rendering: pixelated;
              margin-top: 25px;
            }

            p {
              color: #666;
              font-size: 12px;
              margin-top: 20px;
            }

          </style>

        </head>

        <body>

          <h2>
            ${safeName}
          </h2>

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


    printWindow.onload =
      () => {

        printWindow.focus();

        printWindow.print();
      };
  }


  // ============================================================
  // OPEN / CLOSE
  // ============================================================

  useEffect(() => {

    if (!open) {

      setDataUrl(null);
      setError(null);
      setLoading(false);

      return;
    }


    loadQr();

  }, [open, userId]);


  // ============================================================
  // UI
  // ============================================================

  return (

    <Dialog
      open={open}
      onOpenChange={setOpen}
    >

      <Button
        variant="outline"
        size="sm"
        onClick={() =>
          setOpen(true)
        }
      >
        QR কোড
      </Button>


      <DialogContent
        className="
          w-[calc(100%-24px)]
          max-w-md
          rounded-2xl
        "
      >

        <DialogHeader>

          <DialogTitle
            className="pr-8 text-lg"
          >
            {userName} — লগইন QR কোড
          </DialogTitle>


          <DialogClose
            className="
              absolute
              right-4
              top-4
              rounded-md
              opacity-70
              hover:opacity-100
            "
          >

            <X className="h-5 w-5" />

          </DialogClose>

        </DialogHeader>


        <div
          className="
            flex
            flex-col
            items-center
            gap-4
            py-2
          "
        >

          {/* QR PREVIEW */}

          <div
            className="
              flex
              aspect-square
              w-full
              max-w-[360px]
              items-center
              justify-center
              overflow-hidden
              rounded-2xl
              border
              bg-white
              p-4
              shadow-sm
            "
          >

            {loading ? (

              <div
                className="
                  flex
                  flex-col
                  items-center
                  gap-3
                  text-muted-foreground
                "
              >

                <Loader2
                  className="
                    h-10
                    w-10
                    animate-spin
                  "
                />

                <span className="text-sm">
                  QR কোড লোড হচ্ছে...
                </span>

              </div>

            ) : dataUrl ? (

              <img
                src={dataUrl}
                alt={`${userName} Login QR Code`}
                className="
                  h-full
                  w-full
                  object-contain
                "
                draggable={false}
              />

            ) : (

              <div
                className="
                  px-6
                  text-center
                "
              >

                <p
                  className="
                    text-lg
                    font-medium
                    text-muted-foreground
                  "
                >
                  QR Code নেই
                </p>


                {error && (

                  <p
                    className="
                      mt-3
                      break-words
                      text-xs
                      text-red-600
                    "
                  >
                    {error}
                  </p>

                )}

              </div>

            )}

          </div>


          {/* BUTTONS */}

          {dataUrl && (

            <div
              className="
                grid
                w-full
                grid-cols-2
                gap-2
              "
            >

              <Button
                variant="outline"
                onClick={
                  handleDownloadPng
                }
              >

                <ImageDown
                  className="
                    mr-2
                    h-4
                    w-4
                  "
                />

                QR ডাউনলোড

              </Button>


              <Button
                variant="outline"
                onClick={
                  handleDownloadPdf
                }
              >

                <FileDown
                  className="
                    mr-2
                    h-4
                    w-4
                  "
                />

                PDF ডাউনলোড

              </Button>


              <Button
                variant="outline"
                className="col-span-2"
                onClick={
                  handlePrint
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


              <Button
                variant="destructive"
                className="col-span-2"
                onClick={
                  handleRegenerate
                }
                disabled={
                  regenerating
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

                নতুন QR তৈরি করুন

              </Button>

            </div>

          )}


          {/* RETRY */}

          {!loading &&
            !dataUrl && (

              <Button
                variant="outline"
                className="w-full"
                onClick={loadQr}
              >

                <RotateCw
                  className="
                    mr-2
                    h-4
                    w-4
                  "
                />

                আবার চেষ্টা করুন

              </Button>

            )}

        </div>

      </DialogContent>

    </Dialog>
  );
}