"use client";

import { useEffect } from "react";
import { X } from "lucide-react";

export function Modal({
  open,
  onClose,
  size = "lg",
  hideClose = false,
  children,
}: {
  open: boolean;
  onClose: () => void;
  size?: "lg" | "wide";
  hideClose?: boolean;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  const width = size === "wide" ? "sm:max-w-[800px]" : "sm:max-w-lg";
  const maxHeight = size === "wide" ? "max-h-[90vh] sm:max-h-[80vh]" : "max-h-[92vh]";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        className={`relative z-10 w-full ${maxHeight} overflow-y-auto rounded-t-2xl bg-white shadow-2xl ${width} sm:rounded-2xl`}
      >
        {!hideClose && (
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute right-3 top-3 z-20 inline-flex size-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="size-5" />
          </button>
        )}
        {children}
      </div>
    </div>
  );
}
