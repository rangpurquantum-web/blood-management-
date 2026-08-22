"use client";

import { useEffect, useState } from "react";
import { Droplet } from "lucide-react";

const LOADING_MESSAGES = [
  "প্রতিটি কাজ আমি সবচেয়ে ভালোভাবে করব।",
  "আমি পারি, আমি করব, আমার জীবন, আমি গড়ব।",
  "সুস্থ দেহ প্রশান্ত মন কর্মব্যস্ত সুখী জীবন।",
  "ভালো ভাবব ভালো বলব ভালো করবো ভালো থাকব।",
  "ভালো মানুষ ভালো দেশ স্বর্গভূমি বাংলাদেশ।",
];

function getRandomIndex(exclude?: number) {
  if (LOADING_MESSAGES.length === 1) return 0;
  let index = Math.floor(Math.random() * LOADING_MESSAGES.length);
  while (index === exclude) {
    index = Math.floor(Math.random() * LOADING_MESSAGES.length);
  }
  return index;
}

export default function DashboardLoading() {
  const [index, setIndex] = useState(() => getRandomIndex());
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      const timeout = setTimeout(() => {
        setIndex((prev) => getRandomIndex(prev));
        setVisible(true);
      }, 300);
      return () => clearTimeout(timeout);
    }, 2600);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-6 p-8">
      {/* Icon */}
      <div className="relative flex h-20 w-20 items-center justify-center">
        <span className="absolute inset-0 rounded-full border-2 border-primary/15" />
        <span className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary border-r-primary animate-spin [animation-duration:1.1s]" />
        <span className="absolute inset-2 rounded-full bg-primary/5 animate-ping [animation-duration:2s]" />
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md shadow-primary/20">
          <Droplet className="h-6 w-6 fill-current" />
        </div>
      </div>

      {/* Message */}
      <div className="h-12 flex items-center justify-center px-4">
        <p
          className={`text-sm font-medium text-foreground/80 text-center max-w-xs transition-all duration-300 ${
            visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
          }`}
        >
          {LOADING_MESSAGES[index]}
        </p>
      </div>

      {/* Dots */}
      <div className="flex items-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full bg-primary/40 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </div>
  );
}