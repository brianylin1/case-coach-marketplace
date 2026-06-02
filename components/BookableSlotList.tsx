"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { BookingModal } from "./BookingModal";
import type { SlotView } from "@/lib/types";

// Slot picker used on the standalone coach page. Reuses BookingModal so the
// payment + confirmation flow is identical to the session browser.
export function BookableSlotList({
  slots,
  isStudent,
}: {
  slots: SlotView[];
  isStudent: boolean;
}) {
  const router = useRouter();
  const [bookingSlot, setBookingSlot] = useState<SlotView | null>(null);

  if (slots.length === 0) {
    return (
      <p className="text-sm text-slate-500">
        No open sessions right now — check back soon.
      </p>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {slots.map((s) => (
          <button
            key={s.key}
            onClick={() => setBookingSlot(s)}
            className="flex flex-col items-start rounded-xl border border-slate-300 px-3 py-2 text-left transition hover:border-indigo-500 hover:bg-indigo-50"
          >
            <span className="text-sm font-semibold text-slate-900">{s.timeLabel}</span>
            <span className="text-xs text-slate-500">
              {s.dateLabel.replace(/^[A-Za-z]+, /, "")}
            </span>
          </button>
        ))}
      </div>
      <BookingModal
        slot={bookingSlot}
        isStudent={isStudent}
        onClose={() => setBookingSlot(null)}
        onBooked={() => router.refresh()}
      />
    </div>
  );
}
