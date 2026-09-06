import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import { AppProviders } from "@/components/providers/app-providers";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { RegisterServiceWorker } from "@/components/pwa/register-sw";
import ReceiveFcmToken from "@/components/pwa/receive-fcm-token";
import { UpdateChecker } from "@/components/pwa/update-checker";
import { AppBootLoader } from "@/components/pwa/app-boot-loader";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Quantum Blood Donor Pool",
  description:
    "Secure internal portal for managing blood donors, donation history, and blood requests.",
  manifest: "/manifest.json",
  icons: {
    apple: "/icons/icon-192x192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Quantum Blood Donor Pool",
  },
};

export const viewport: Viewport = {
  themeColor: "#1E3A8A",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bn" suppressHydrationWarning>
      <head>
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body {
                background-color: #0F172A;
                margin: 0;
              }
            `,
          }}
        />

        <link rel="stylesheet" href="https://fonts.cdnfonts.com/css/siam-rupali" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/ekushey/fonts@master/siam-rupali/siamrupali.css" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+Bengali:wght@400;500;600;700&display=swap" />
      </head>
      <body className="min-h-screen bg-background font-sans" suppressHydrationWarning>
        <RegisterServiceWorker />
        <AppProviders>
          <ReceiveFcmToken />
          <UpdateChecker />
          <AppBootLoader>
            <TooltipProvider>{children}</TooltipProvider>
          </AppBootLoader>
          <Toaster position="top-center" richColors />
        </AppProviders>
      </body>
    </html>
  );
}