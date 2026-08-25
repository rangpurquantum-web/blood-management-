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
  themeColor: "#3D0B12",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bn" suppressHydrationWarning>
      <head>
        {/*
          ============================================================
          BOOT BACKGROUND FIX
          ============================================================
          Native splash হাইড হওয়ার পর, Tailwind CSS bundle লোড হওয়ার
          আগ পর্যন্ত WebView-এর ডিফল্ট সাদা background এক মুহূর্তের
          জন্য দেখা যায় ("white flash"). এই raw inline <style> ট্যাগটা
          সবার আগে paint হয় (কোনো external CSS ফাইলের অপেক্ষা ছাড়াই),
          তাই html/body সবসময় ব্র্যান্ড কালারে থাকে — সাদা flash হয় না।

          ব্র্যান্ড কালার এখানে হোমপেজের background (#3D0B12) এর সাথে
          মিলিয়ে রাখা হয়েছে। হোমপেজের রঙ বদলালে এখানেও বদলাতে হবে।

          NOTE: body-তে bg-background ক্লাস যোগ করা হয়েছে যাতে CSS
          লোড হওয়ার পর এই ম্যারুন কালার থিমের সঠিক background দিয়ে
          ওভাররাইড হয়ে যায় — নাহলে এটা স্থায়ীভাবে থেকে যাচ্ছিল
          (Chrome-এ scroll/overscroll bounce করলে দেখা যাচ্ছিল)।
          ============================================================
        */}
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body {
                background-color: #3D0B12;
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