import { Droplet } from "lucide-react";

const LOADING_MESSAGES = [
  "প্রতিটি কাজ আমি সবচেয়ে ভালোভাবে করব।",
  "আমি পারি, আমি করব, আমার জীবন, আমি গড়ব।",
  "সুস্থ দেহ প্রশান্ত মন কর্মব্যস্ত সুখী জীবন।",
  "ভালো ভাবব ভালো বলব ভালো করবো ভালো থাকব।",
  "ভালো মানুষ ভালো দেশ স্বর্গভূমি বাংলাদেশ।",
];

export default function DashboardLoading() {
  const message =
    LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)];

  return (
    <div className="flex min-h-[60vh] w-full flex-col items-center justify-center gap-4 p-8">
      <div className="relative flex h-16 w-16 items-center justify-center">
        <span className="absolute inset-0 rounded-full border-2 border-primary/20" />
        <span className="absolute inset-0 rounded-full border-2 border-transparent border-t-primary animate-spin" />
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm animate-pulse">
          <Droplet className="h-5 w-5 fill-current" />
        </div>
      </div>
      <p className="text-sm text-muted-foreground text-center max-w-xs animate-pulse">
        {message}
      </p>
    </div>
  );
}