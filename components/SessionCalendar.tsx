"use client";

import { Fragment, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Zap } from "lucide-react";
import { Modal } from "./Modal";
import { Avatar } from "./Avatar";
import { FirmBadge } from "./FirmBadge";
import { FocusTag } from "./FocusTag";
import { CoachProfilePanel } from "./CoachProfilePanel";
import { BookingModal } from "./BookingModal";
import { FIRMS, firmStyle } from "@/lib/constants";
import { formatRate } from "@/lib/format";
import { btnPrimary, btnSecondary } from "@/lib/ui";
import type { CalendarCell, CoachView, SlotView } from "@/lib/types";

type Day = { dayKey: string; short: string; sub: string };

function hourLabel(h: number): string {
  const period = h < 12 ? "AM" : "PM";
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display} ${period}`;
}

export function SessionCalendar({
  days,
  hours,
  cells,
  isStudent,
  filterQuery,
}: {
  days: Day[];
  hours: number[];
  cells: CalendarCell[];
  isStudent: boolean;
  filterQuery: string;
}) {
  const router = useRouter();
  const cellMap = useMemo(() => {
    const map = new Map<string, CalendarCell>();
    for (const c of cells) map.set(`${c.dayKey}#${c.hour}`, c);
    return map;
  }, [cells]);

  const [selected, setSelected] = useState<(Day & { hour: number }) | null>(null);
  const [slots, setSlots] = useState<SlotView[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [bookingSlot, setBookingSlot] = useState<SlotView | null>(null);
  const [profileCoach, setProfileCoach] = useState<CoachView | null>(null);

  const groups = useMemo(() => {
    if (!slots) return [];
    return FIRMS.map((firm) => ({
      firm,
      slots: slots.filter((s) => s.coach.firm === firm),
    })).filter((g) => g.slots.length > 0);
  }, [slots]);

  async function openCell(day: Day, hour: number) {
    setSelected({ ...day, hour });
    setSlots(null);
    setLoading(true);
    const startISO = new Date(
      `${day.dayKey}T${String(hour).padStart(2, "0")}:00:00.000Z`,
    ).toISOString();
    try {
      const res = await fetch(
        `/api/sessions/cell?start=${encodeURIComponent(startISO)}${filterQuery ? `&${filterQuery}` : ""}`,
      );
      const data = await res.json();
      setSlots(res.ok ? data.slots : []);
    } catch {
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }

  function closeCell() {
    setSelected(null);
    setSlots(null);
  }

  if (cells.length === 0) {
    return (
      <div className="mt-6 flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-16 text-center">
        <h2 className="font-semibold text-slate-900">No open sessions this week</h2>
        <p className="mt-1 max-w-sm text-sm text-slate-500">
          Try clearing a filter, or check back as coaches add availability.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="mb-3 flex items-center gap-4 text-xs text-slate-500">
        {(["McKinsey", "Bain", "BCG"] as const).map((f) => (
          <span key={f} className="inline-flex items-center gap-1.5">
            <span className={`size-2 rounded-full ${firmStyle(f).dot}`} />
            {f}
          </span>
        ))}
        <span className="ml-auto">number = coaches free · tap a time</span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <div
          className="grid min-w-[660px]"
          style={{ gridTemplateColumns: "3.5rem repeat(7, minmax(80px, 1fr))" }}
        >
          <div className="sticky left-0 z-20 border-b border-slate-100 bg-white" />
          {days.map((d) => (
            <div
              key={d.dayKey}
              className="border-b border-l border-slate-100 px-1 py-2 text-center"
            >
              <div className="text-xs font-semibold text-slate-900">{d.short}</div>
              <div className="text-[11px] text-slate-400">{d.sub}</div>
            </div>
          ))}

          {hours.map((hour) => (
            <Fragment key={hour}>
              <div className="sticky left-0 z-10 flex items-center justify-end border-b border-slate-100 bg-white pr-2 text-[11px] text-slate-400">
                {hourLabel(hour)}
              </div>
              {days.map((d) => {
                const cell = cellMap.get(`${d.dayKey}#${hour}`);
                if (!cell) {
                  return (
                    <div
                      key={d.dayKey}
                      className="h-12 border-b border-l border-slate-100"
                    />
                  );
                }
                return (
                  <button
                    key={d.dayKey}
                    type="button"
                    onClick={() => openCell(d, hour)}
                    aria-label={`${d.short} ${d.sub}, ${hourLabel(hour)} — ${cell.count} coaches available`}
                    className="flex h-12 flex-col items-center justify-center gap-0.5 border-b border-l border-slate-100 bg-indigo-50 transition hover:bg-indigo-100"
                  >
                    <span className="text-sm font-semibold text-indigo-700">
                      {cell.count}
                    </span>
                    <span className="flex gap-0.5">
                      {cell.firms.slice(0, 3).map((f) => (
                        <span
                          key={f}
                          className={`size-1.5 rounded-full ${firmStyle(f).dot}`}
                        />
                      ))}
                    </span>
                  </button>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>

      {/* Cell modal: coaches at this exact day/hour, grouped by firm */}
      <Modal open={selected !== null} onClose={closeCell}>
        {selected && (
          <div className="p-6">
            <h2 className="text-lg font-bold text-slate-900">Coaches available</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {selected.short}, {selected.sub} · {hourLabel(selected.hour)}
            </p>

            {loading ? (
              <div className="py-12 text-center text-sm text-slate-500">
                <Loader2 className="mx-auto size-6 animate-spin text-slate-400" />
                <p className="mt-2">Loading coaches…</p>
              </div>
            ) : !slots || slots.length === 0 ? (
              <p className="py-12 text-center text-sm text-slate-500">
                These sessions were just taken — try another time.
              </p>
            ) : (
              <div className="mt-4 space-y-5">
                {groups.map((group) => (
                  <div key={group.firm}>
                    <div className="mb-2 flex items-center gap-2">
                      <FirmBadge firm={group.firm} />
                      <span className="text-xs text-slate-400">
                        {group.slots.length} available
                      </span>
                    </div>
                    <div className="space-y-3">
                      {group.slots.map((slot) => (
                        <CoachRow
                          key={slot.key}
                          slot={slot}
                          onBook={() => {
                            setSelected(null);
                            setBookingSlot(slot);
                          }}
                          onViewProfile={() => {
                            setSelected(null);
                            setProfileCoach(slot.coach);
                          }}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Reused coach profile modal */}
      <Modal open={profileCoach !== null} onClose={() => setProfileCoach(null)}>
        {profileCoach && (
          <div className="p-6">
            <CoachProfilePanel coach={profileCoach} />
          </div>
        )}
      </Modal>

      {/* Reused booking flow */}
      <BookingModal
        slot={bookingSlot}
        isStudent={isStudent}
        onClose={() => setBookingSlot(null)}
        onBooked={() => router.refresh()}
      />
    </div>
  );
}

function CoachRow({
  slot,
  onBook,
  onViewProfile,
}: {
  slot: SlotView;
  onBook: () => void;
  onViewProfile: () => void;
}) {
  const c = slot.coach;
  return (
    <div className="rounded-xl border border-slate-200 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar name={c.name} />
          <div>
            <p className="font-semibold text-slate-900">{c.name}</p>
            <p className="text-sm text-slate-500">
              {c.title} · {c.yearsAtFirm} yr{c.yearsAtFirm === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        <span className="shrink-0 text-sm font-semibold text-slate-900">
          {formatRate(c.hourlyRate)}
        </span>
      </div>
      {c.focusKeys.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {c.focusKeys.slice(0, 4).map((k) => (
            <FocusTag key={k} focusKey={k} />
          ))}
        </div>
      )}
      <div className="mt-3 flex gap-2">
        <button type="button" onClick={onViewProfile} className={`${btnSecondary} flex-1`}>
          View profile
        </button>
        <button type="button" onClick={onBook} className={`${btnPrimary} flex-1`}>
          <Zap className="size-4" />
          Book instantly
        </button>
      </div>
    </div>
  );
}
