"use client";

import { useState } from "react";

export default function DebugTools() {
  const [password, setPassword] = useState("");
  const [hashResult, setHashResult] = useState("");
  const [dbUrl, setDbUrl] = useState("");
  const [encryptResult, setEncryptResult] = useState("");

  async function generateHash() {
    setHashResult("Generating...");
    const res = await fetch("/api/debug/hash", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();
    setHashResult(data.hash || JSON.stringify(data));
  }

  async function encryptUrl() {
  setEncryptResult("Encrypting...");
  try {
    const res = await fetch("/api/debug/encrypt-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: dbUrl }),
    });
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      setEncryptResult(`Status ${res.status}, non-JSON response:\n${text.slice(0, 500)}`);
      return;
    }
    setEncryptResult(data.encrypted || `Status ${res.status}: ${JSON.stringify(data)}`);
  } catch (e: any) {
    setEncryptResult("Fetch error: " + e.message);
  }
}

  return (
    <div style={{ maxWidth: 500, margin: "40px auto", padding: 16, fontFamily: "sans-serif" }}>
      <h2>Password Hash Generator</h2>
      <input
        style={{ width: "100%", padding: 10, fontSize: 16, marginTop: 8 }}
        placeholder="Enter password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button style={{ marginTop: 16, padding: 10, width: "100%" }} onClick={generateHash}>
        Generate Hash
      </button>
      <div style={{ marginTop: 16, wordBreak: "break-all", background: "#f4f4f4", padding: 12, whiteSpace: "pre-wrap" }}>
        {hashResult}
      </div>

      <hr style={{ margin: "32px 0" }} />

      <h2>DB URL Encryptor</h2>
      <input
        style={{ width: "100%", padding: 10, fontSize: 16, marginTop: 8 }}
        placeholder="postgresql://user:pass@host/db"
        value={dbUrl}
        onChange={(e) => setDbUrl(e.target.value)}
      />
      <button style={{ marginTop: 16, padding: 10, width: "100%" }} onClick={encryptUrl}>
        Encrypt URL
      </button>
      <div style={{ marginTop: 16, wordBreak: "break-all", background: "#f4f4f4", padding: 12, whiteSpace: "pre-wrap" }}>
        {encryptResult}
      </div>
    </div>
  );
}