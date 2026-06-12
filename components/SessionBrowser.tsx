"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CalendarX } from "lucide-react";
import { Modal } from "./Modal";
import { SlotCard } from "./SlotCard";
import { CoachProfilePanel } from "./CoachProfilePanel";
import { BookingModal } from "./BookingModal";
import type { DaySection, SlotView } from "@/lib/types";

// Calendar-first browser: day-grouped slot cards. Clicking a card opens the
// coach profile modal; "Book instantly" opens the booking modal.
export function SessionBrowser({
  sections,
  isStudent,
  paymentsEnabled,
}: {
  sections: DaySection[];
  isStudent: boolean;
  paymentsEnabled: boolean;
}) {
  const router = useRouter();
  const [profileCoachId, setProfileCoachId] = useState<number | null>(null);
  const [bookingSlot, setBookingSlot] = useState<SlotView | null>(null);

  const allSlots = useMemo(() => sections.flatMap((s) => s.slots), [sections]);
  const profileCoach =
    profileCoachId != null
      ? (allSlots.find((s) => s.coach.id === profileCoachId)?.coach ?? null)
      : null;
  const profileSlots =
    profileCoachId != null
      ? allSlots.filter((s) => s.coach.id === profileCoachId)
      : [];

  if (allSlots.length === 0) {
    return (
      <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
        <CalendarX className="size-8 text-slate-400" />
        <h2 className="mt-3 font-semibold text-slate-900">No open sessions match</h2>
        <p className="mt-1 max-w-sm text-sm text-slate-500">
          Try a different day, firm, or price — or clear your filters.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-8">
      {sections.map(
        (section) =>
          section.slots.length > 0 && (
            <section key={section.dayKey}>
              <div className="mb-3 flex items-baseline gap-2">
                <h2 className="text-lg font-semibold text-slate-900">
                  {section.label}
                </h2>
                <span className="text-sm text-slate-400">
                  {section.dateLabel} · {section.slots.length} open
                </span>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {section.slots.map((slot) => (
                  <SlotCard
                    key={slot.key}
                    slot={slot}
                    onOpen={() => setProfileCoachId(slot.coach.id)}
                    onBook={() => setBookingSlot(slot)}
                  />
                ))}
              </div>
            </section>
          ),
      )}

      <Modal open={profileCoach != null} onClose={() => setProfileCoachId(null)}>
        {profileCoach && (
          <div className="p-6">
            <CoachProfilePanel coach={profileCoach} />
            <div className="mt-6">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Open sessions
              </h3>
              <div className="mt-2 flex flex-wrap gap-2">
                {profileSlots.map((s) => (
                  <button
                    key={s.key}
                    onClick={() => {
                      setProfileCoachId(null);
                      setBookingSlot(s);
                    }}
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-indigo-500 hover:bg-indigo-50 hover:text-indigo-700"
                  >
                    {s.dateLabel.replace(/^[A-Za-z]+, /, "")} · {s.timeLabel}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </Modal>

      <BookingModal
        slot={bookingSlot}
        isStudent={isStudent}
        paymentsEnabled={paymentsEnabled}
        onClose={() => setBookingSlot(null)}
        onBooked={() => router.refresh()}
      />
    </div>
  );
}
