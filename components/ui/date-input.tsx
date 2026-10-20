"use client";

import * as React from "react";
import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import { ddmmyyyyToISO, isoToDDMMYYYY, maskDDMMYYYY } from "@/lib/date-utils";

type DateInputProps = {
  value?: string | null;
  onChange: (value: string) => void;
  min?: string;
  max?: string;
  error?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
};

export function DateInput({
  value, onChange, min, max, error, disabled, id, className,
}: DateInputProps) {
  const [text, setText] = React.useState(isoToDDMMYYYY(value));
  const [localError, setLocalError] = React.useState("");
  const pickerRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const current = ddmmyyyyToISO(text) ?? "";
    if (current !== (value ?? "")) setText(isoToDDMMYYYY(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function commit(next: string) {
    setText(next);
    if (next === "" || next.length < 10) {
      setLocalError("");
      onChange("");
      return;
    }
    const iso = ddmmyyyyToISO(next);
    if (!iso) {
      setLocalError("সঠিক তারিখ দিন (DD-MM-YYYY)");
      onChange("");
    } else if (min && iso < min) {
      setLocalError(`${isoToDDMMYYYY(min)} বা তার পরের তারিখ দিন`);
      onChange("");
    } else if (max && iso > max) {
      setLocalError(`${isoToDDMMYYYY(max)} এর পরের তারিখ দেওয়া যাবে না`);
      onChange("");
    } else {
      setLocalError("");
      onChange(iso);
    }
  }

  function openPicker() {
    const el = pickerRef.current;
    if (!el) return;
    if (typeof el.showPicker === "function") el.showPicker();
    else el.click();
  }

  const shownError = error || localError;

  return (
    <div className={className}>
      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder="DD-MM-YYYY"
          maxLength={10}
          disabled={disabled}
          value={text}
          onChange={(e) => commit(maskDDMMYYYY(e.target.value))}
          className={cn(
            "flex h-10 w-full rounded-md border border-input bg-background px-3 pr-10 text-sm",
            "placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            shownError && "border-red-500"
          )}
        />
        <button
          type="button"
          disabled={disabled}
          onClick={openPicker}
          aria-label="ক্যালেন্ডার খুলুন"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
        >
          <CalendarDays className="h-5 w-5" />
        </button>
        <input
          ref={pickerRef}
          type="date"
          tabIndex={-1}
          aria-hidden
          min={min}
          max={max}
          value={ddmmyyyyToISO(text) ?? ""}
          onChange={(e) => e.target.value && commit(isoToDDMMYYYY(e.target.value))}
          className="pointer-events-none absolute inset-0 opacity-0"
        />
      </div>
      {shownError && <p className="mt-1 text-xs text-red-600">{shownError}</p>}
    </div>
  );
}
