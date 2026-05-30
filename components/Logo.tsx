import { Target } from "lucide-react";

export function Logo({ className }: { className?: string }) {
  return (
    <span
      className={`inline-flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-sm ${className ?? ""}`}
      aria-hidden
    >
      <Target className="size-[18px]" strokeWidth={2.5} />
    </span>
  );
}
