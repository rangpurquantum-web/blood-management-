"use client";

import { useState } from "react";

type DonationEditorProps = {
  token: string;
  currentDate: string | null;
  onUpdated?: () => void;
};

export default function DonationEditor({
  token,
  currentDate,
  onUpdated,
}: DonationEditorProps) {
  const [date, setDate] = useState(
    currentDate
      ? new Date(currentDate).toISOString().split("T")[0]
      : ""
  );

  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSave() {
    if (!date) {
      setMessage("Please select a donation date.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/public/donor/${token}/donate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            donationDate: date,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error || "Failed to update donation date"
        );
      }

      setMessage("Donation date updated successfully.");

      setOpen(false);

      onUpdated?.();

      // Refresh server component data
      window.location.reload();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong."
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-4">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="w-full rounded-lg bg-red-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-red-700"
        >
          Update Last Donation Date
        </button>
      ) : (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="mb-3 text-sm font-bold text-red-800">
            Update Last Donation Date
          </p>

          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-sm outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200"
          />

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setMessage("");
              }}
              disabled={saving}
              className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="flex-1 rounded-lg bg-red-600 px-4 py-3 text-sm font-bold text-white disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Date"}
            </button>
          </div>

          {message && (
            <p className="mt-3 text-center text-xs font-medium text-slate-700">
              {message}
            </p>
          )}
        </div>
      )}
    </div>
  );
}