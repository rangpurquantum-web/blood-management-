"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";

// Android WebView bridge থেকে FCM token receive করে backend-এ পাঠানো।
// MainActivity.java window.receiveFcmToken(token) কল করে — এটা app
// চালু হওয়ার সাথে সাথেই (onCreate) হয়, অর্থাৎ login হওয়ার অনেক আগেই।
// তাই token পেলেও, session না থাকলে সাথে সাথে পাঠানো যায় না (401 হবে)।
// এই কম্পোনেন্ট token-টা ধরে রাখে এবং session আসার সাথে সাথে (বা
// session পরিবর্তন হলে) পাঠায়।
export default function ReceiveFcmToken() {
  const { data: session, status } = useSession();
  const pendingTokenRef = useRef<string | null>(null);
  const sentTokenRef = useRef<string | null>(null);

  useEffect(() => {
    async function sendToken(token: string) {
      try {
        const deviceInfo =
          typeof navigator !== "undefined" ? navigator.userAgent : undefined;

        const res = await fetch("/api/push/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fcmToken: token, deviceInfo }),
        });

        if (res.ok) {
          sentTokenRef.current = token;
          pendingTokenRef.current = null;
        } else if (res.status === 401) {
          pendingTokenRef.current = token;
        } else {
          console.error("Push registration failed with status:", res.status);
        }
      } catch (err) {
        console.error("Failed to register FCM token:", err);
        pendingTokenRef.current = token;
      }
    }

    (window as any).receiveFcmToken = (token: string) => {
      if (status === "authenticated") {
        sendToken(token);
      } else {
        pendingTokenRef.current = token;
      }
    };

    return () => {
      delete (window as any).receiveFcmToken;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    async function retrySend(token: string) {
      try {
        const deviceInfo =
          typeof navigator !== "undefined" ? navigator.userAgent : undefined;

        const res = await fetch("/api/push/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ fcmToken: token, deviceInfo }),
        });

        if (res.ok) {
          sentTokenRef.current = token;
          pendingTokenRef.current = null;
        } else {
          console.error("Retry push registration failed with status:", res.status);
        }
      } catch (err) {
        console.error("Retry: failed to register FCM token:", err);
      }
    }

    if (
      status === "authenticated" &&
      pendingTokenRef.current &&
      pendingTokenRef.current !== sentTokenRef.current
    ) {
      retrySend(pendingTokenRef.current);
    }
  }, [status, session]);

  return null;
}