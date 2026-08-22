"use client";

import { useEffect } from "react";

// Android WebView bridge থেকে FCM token receive করে backend-এ পাঠানো।
// MainActivity.java window.receiveFcmToken(token) কল করে; এই কম্পোনেন্ট
// সেই ফাংশনটা mount হওয়ার সাথে সাথেই define করে, যাতে race condition না হয়।
export default function ReceiveFcmToken() {
  useEffect(() => {
    async function sendToken(token: string) {
      try {
        const deviceInfo =
          typeof navigator !== "undefined" ? navigator.userAgent : undefined;

        await fetch("/api/push/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fcmToken: token, deviceInfo }),
        });
      } catch (err) {
        console.error("Failed to register FCM token:", err);
      }
    }

    (window as any).receiveFcmToken = (token: string) => {
      sendToken(token);
    };

    return () => {
      delete (window as any).receiveFcmToken;
    };
  }, []);

  return null;
}
