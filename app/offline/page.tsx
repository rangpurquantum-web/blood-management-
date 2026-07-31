"use client";

export default function OfflinePage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #fef2f2 0%, #ffffff 100%)",
        fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
        padding: "1.5rem",
      }}
    >
      <div
        style={{
          textAlign: "center",
          maxWidth: "420px",
        }}
      >
        {/* Offline Icon */}
        <div
          style={{
            width: "80px",
            height: "80px",
            margin: "0 auto 1.5rem",
            borderRadius: "50%",
            background: "#991b1b",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width="40"
            height="40"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
            <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
            <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <line x1="12" y1="20" x2="12.01" y2="20" />
          </svg>
        </div>

        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            color: "#991b1b",
            margin: "0 0 0.75rem",
          }}
        >
          আপনি অফলাইনে আছেন
        </h1>

        <p
          style={{
            fontSize: "1rem",
            color: "#64748b",
            margin: "0 0 2rem",
            lineHeight: 1.6,
          }}
        >
          ইন্টারনেট সংযোগ পাওয়া যাচ্ছে না। অনুগ্রহ করে আপনার নেটওয়ার্ক সংযোগ
          পরীক্ষা করে আবার চেষ্টা করুন।
        </p>

        <button
          onClick={() => window.location.reload()}
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "0.75rem 1.5rem",
            backgroundColor: "#991b1b",
            color: "white",
            border: "none",
            borderRadius: "0.5rem",
            fontSize: "0.875rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          আবার চেষ্টা করুন
        </button>
      </div>
    </div>
  );
}
