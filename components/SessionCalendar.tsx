"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarX, Loader2, Star, X, Zap } from "lucide-react";
import { Modal } from "./Modal";
import { Avatar } from "./Avatar";
import { FirmBadge } from "./FirmBadge";
import { CoachProfilePanel } from "./CoachProfilePanel";
import { BookingModal } from "./BookingModal";
import { FIRMS, bestForPhrase, firmStyle } from "@/lib/constants";
import { formatRate } from "@/lib/format";
import { wallTimeToUtc } from "@/lib/timezone";
import { btnPrimary, btnSecondary } from "@/lib/ui";
import type { CalendarCell, SlotView } from "@/lib/types";

type Day = { dayKey: string; short: string; sub: string };
type SortKey = "recommended" | "price" | "experience";

const ROW_LIMIT = 10; // coaches shown per firm group before "Show more"

function hourLabel(h: number): string {
  const period = h < 12 ? "AM" : "PM";
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display} ${period}`;
}

// A cell is a viewer-local day + hour; resolve it to the absolute UTC instant.
// Returns null only for a wall time that doesn't exist (DST spring-forward gap).
function cellStartISO(dayKey: string, hour: number, timeZone: string): string | null {
  const [year, month, day] = dayKey.split("-").map(Number);
  const start = wallTimeToUtc(year, month, day, hour, 0, timeZone);
  return start ? start.toISOString() : null;
}

const SORTS: { value: SortKey; label: string }[] = [
  { value: "recommended", label: "Recommended" },
  { value: "price", label: "Lowest price" },
  { value: "experience", label: "Most experience" },
];

export function SessionCalendar({
  days,
  hours,
  cells,
  isStudent,
  paymentsEnabled,
  filterQuery,
  nowMs,
  hasFilters,
  listHref,
  viewerTz,
}: {
  days: Day[];
  hours: number[];
  cells: CalendarCell[];
  isStudent: boolean;
  paymentsEnabled: boolean;
  filterQuery: string;
  nowMs: number;
  hasFilters: boolean;
  listHref: string;
  viewerTz: string;
}) {
  const router = useRouter();
  const cellMap = useMemo(() => {
    const map = new Map<string, CalendarCell>();
    for (const c of cells) map.set(`${c.dayKey}#${c.hour}`, c);
    return map;
  }, [cells]);

  const total = useMemo(() => cells.reduce((sum, c) => sum + c.count, 0), [cells]);

  const [selected, setSelected] = useState<(Day & { hour: number }) | null>(null);
  const [slots, setSlots] = useState<SlotView[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [sort, setSort] = useState<SortKey>("recommended");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [bookingSlot, setBookingSlot] = useState<SlotView | null>(null);
  // Keep the whole slot (not just the coach) so the profile modal can offer a
  // direct "Book this time" CTA for the time the student was already looking at.
  const [profileSlot, setProfileSlot] = useState<SlotView | null>(null);
  const [hintDismissed, setHintDismissed] = useState(false);

  const groups = useMemo(() => {
    if (!slots) return [];
    const cmp =
      sort === "price"
        ? (a: SlotView, b: SlotView) => a.coach.hourlyRate - b.coach.hourlyRate
        : sort === "experience"
          ? (a: SlotView, b: SlotView) => b.coach.yearsAtFirm - a.coach.yearsAtFirm
          : (a: SlotView, b: SlotView) => a.coach.name.localeCompare(b.coach.name);
    return FIRMS.map((firm) => ({
      firm,
      slots: slots.filter((s) => s.coach.firm === firm).sort(cmp),
    })).filter((g) => g.slots.length > 0);
  }, [slots, sort]);

  async function openCell(day: Day, hour: number) {
    const iso = cellStartISO(day.dayKey, hour, viewerTz);
    if (!iso) return;
    setSelected({ ...day, hour });
    setSlots(null);
    setExpanded(new Set());
    setLoading(true);
    try {
      const res = await fetch(
        `/api/sessions/cell?start=${encodeURIComponent(iso)}${filterQuery ? `&${filterQuery}` : ""}`,
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
        <CalendarX className="size-8 text-slate-400" />
        <h2 className="mt-3 font-semibold text-slate-900">No open sessions this week</h2>
        <p className="mt-1 max-w-sm text-sm text-slate-500">
          {hasFilters
            ? "No coaches match these filters in the next 7 days."
            : "Check back soon as coaches add availability."}{" "}
          You can also browse everything in List view.
        </p>
        <div className="mt-4 flex gap-2">
          {hasFilters && (
            <Link href="/sessions" className={btnSecondary}>
              Clear filters
            </Link>
          )}
          <Link href={listHref} className={btnPrimary}>
            Switch to List view
          </Link>
        </div>
      </div>
    );
  }

  const showHint = total > 0 && total < 8 && !hintDismissed;

  return (
    <div className="mt-6">
      {showHint && (
        <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <span>
            Only a few open times this week.{" "}
            <Link href={listHref} className="font-medium underline">
              See them all in List view
            </Link>
            .
          </span>
          <button
            type="button"
            onClick={() => setHintDismissed(true)}
            aria-label="Dismiss"
            className="shrink-0 text-amber-500 hover:text-amber-700"
          >
            <X className="size-4" />
          </button>
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
        {(["McKinsey", "Bain", "BCG"] as const).map((f) => (
          <span key={f} className="inline-flex items-center gap-1.5">
            <FirmMonogram firm={f} />
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
              className="border-b border-l border-slate-100 px-1 py-1.5 text-center"
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
                  const iso = cellStartISO(d.dayKey, hour, viewerTz);
                  const isPast = iso ? Date.parse(iso) <= nowMs : false;
                  return (
                    <div
                      key={d.dayKey}
                      aria-hidden
                      className={`flex h-11 items-center justify-center border-b border-l border-slate-100 ${isPast ? "bg-slate-100" : ""}`}
                    >
                      {isPast && (
                        <span className="text-[9px] font-medium uppercase tracking-wide text-slate-300">
                          Past
                        </span>
                      )}
                    </div>
                  );
                }
                return (
                  <button
                    key={d.dayKey}
                    type="button"
                    onClick={() => openCell(d, hour)}
                    aria-label={`${d.short} ${d.sub}, ${hourLabel(hour)} — ${cell.count} coaches available`}
                    className="flex h-11 flex-col items-center justify-center gap-0.5 border-b border-l border-slate-100 bg-indigo-100/60 transition hover:bg-indigo-100"
                  >
                    <span className="whitespace-nowrap text-[11px] font-semibold leading-none text-indigo-700">
                      {cell.count} coach{cell.count === 1 ? "" : "es"}
                    </span>
                    <span className="flex flex-wrap items-center justify-center gap-x-1 leading-none">
                      {cell.firms.slice(0, 3).map((f) => (
                        <CellFirmTag key={f} firm={f} />
                      ))}
                    </span>
                  </button>
                );
              })}
            </Fragment>
          ))}
        </div>
      </div>

      {/* Cell modal: wide, sticky header, internal scroll, grouped + sortable */}
      <Modal open={selected !== null} onClose={closeCell} size="wide" hideClose>
        {selected && (
          <>
            <div className="sticky top-0 z-10 border-b border-slate-100 bg-white px-6 pb-3 pt-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Coaches available</h2>
                  <p className="mt-0.5 text-sm text-slate-500">
                    {selected.short}, {selected.sub} · {hourLabel(selected.hour)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={closeCell}
                  aria-label="Close"
                  className="inline-flex size-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="size-5" />
                </button>
              </div>
              {!loading && slots && slots.length > 0 && (
                <div className="mt-3 flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-400">
                    {slots.length} coach{slots.length === 1 ? "" : "es"}
                  </span>
                  <label className="flex items-center gap-1.5 text-xs text-slate-500">
                    Sort
                    <select
                      value={sort}
                      onChange={(e) => setSort(e.target.value as SortKey)}
                      className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700"
                    >
                      {SORTS.map((s) => (
                        <option key={s.value} value={s.value}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
            </div>

            <div className="px-6 pb-6 pt-4">
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
                <div className="space-y-5">
                  {groups.map((group) => {
                    const isExpanded = expanded.has(group.firm);
                    const visible = isExpanded
                      ? group.slots
                      : group.slots.slice(0, ROW_LIMIT);
                    const hiddenCount = group.slots.length - visible.length;
                    return (
                      <div key={group.firm}>
                        <div className="mb-2 flex items-center gap-2">
                          <FirmBadge firm={group.firm} />
                          <span className="text-xs text-slate-400">
                            {group.slots.length} available
                          </span>
                        </div>
                        <div className="space-y-2">
                          {visible.map((slot) => (
                            <CoachRow
                              key={slot.key}
                              slot={slot}
                              onBook={() => {
                                setSelected(null);
                                setBookingSlot(slot);
                              }}
                              onViewProfile={() => {
                                setSelected(null);
                                setProfileSlot(slot);
                              }}
                            />
                          ))}
                        </div>
                        {hiddenCount > 0 && (
                          <button
                            type="button"
                            onClick={() =>
                              setExpanded((prev) => new Set(prev).add(group.firm))
                            }
                            className="mt-2 text-sm font-medium text-indigo-600 hover:underline"
                          >
                            Show {hiddenCount} more {group.firm} coach
                            {hiddenCount === 1 ? "" : "es"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </Modal>

      <Modal open={profileSlot !== null} onClose={() => setProfileSlot(null)}>
        {profileSlot && (
          <div className="p-6">
            <CoachProfilePanel coach={profileSlot.coach} />
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <span className="text-sm text-slate-600">
                {profileSlot.dateLabel} · {profileSlot.timeLabel}
              </span>
              <button
                type="button"
                className={btnPrimary}
                onClick={() => {
                  const slot = profileSlot;
                  setProfileSlot(null);
                  setBookingSlot(slot);
                }}
              >
                <Zap className="size-4" />
                Book this time · {formatRate(profileSlot.coach.hourlyRate)}
              </button>
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

// Filled badge — used in the legend (the color/abbreviation key).
function FirmMonogram({ firm }: { firm: string }) {
  const style = firmStyle(firm);
  return (
    <span
      className={`inline-flex items-center rounded px-1 text-[9px] font-semibold leading-4 ring-1 ring-inset ${style.badge}`}
    >
      {style.short}
    </span>
  );
}

// Low-emphasis variant — used inside calendar cells so firm hints don't
// overpower the count.
function CellFirmTag({ firm }: { firm: string }) {
  const style = firmStyle(firm);
  return (
    <span className={`text-[10px] font-semibold leading-none ${style.text}`}>
      {style.short}
    </span>
  );
}

// Compact, single-row coach card so students can scan many at once.
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
  // One scannable differentiator per row; full focus detail is behind "View".
  const best = bestForPhrase(c.bestFor, c.focusKeys);
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-slate-200 px-3 py-2">
      {/* info: full row on mobile, shares the row on desktop */}
      <div className="flex min-w-0 flex-1 basis-full items-center gap-3 sm:basis-0">
        <Avatar name={c.name} size="sm" src={c.photoUrl} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-slate-900">{c.name}</p>
            <span className="inline-flex shrink-0 items-center gap-0.5 text-[11px] font-medium text-slate-400">
              <Star className="size-3" />
              New
            </span>
          </div>
          <p className="truncate text-xs text-slate-500">
            {c.firmStatus === "current" ? "Current " : c.firmStatus === "former" ? "Former " : ""}
            {c.title} · {c.yearsAtFirm}y{best ? ` · Best for ${best}` : ""}
          </p>
        </div>
        <span className="shrink-0 text-sm font-semibold text-slate-900">
          {formatRate(c.hourlyRate)}
        </span>
      </div>
      {/* actions: own row on mobile, inline on desktop */}
      <div className="flex shrink-0 basis-full justify-end gap-1.5 sm:basis-auto">
        <button
          type="button"
          onClick={onViewProfile}
          className="rounded-md border border-slate-300 px-2.5 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
        >
          View
        </button>
        <button
          type="button"
          onClick={onBook}
          className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-500"
        >
          <Zap className="size-3.5" />
          Book
        </button>
      </div>
    </div>
  );
}
