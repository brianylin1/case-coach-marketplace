// Helpers for the JSON-string list columns and display formatting.
// Safe to import from both client and server components.

import { zonedDayKey, zonedParts } from "@/lib/timezone";

export function parseList(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const value = JSON.parse(json);
    return Array.isArray(value) ? value.map((v) => String(v)) : [];
  } catch {
    return [];
  }
}

export function serializeList(values: string[]): string {
  return JSON.stringify([...new Set(values.map((v) => v.trim()).filter(Boolean))]);
}

export function formatRate(rate: number): string {
  return rate <= 0 ? "Pro bono" : `$${rate}/hr`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

// ----- Slot / calendar formatting -----
// Instant labels (formatSlotParts) render in a given IANA zone. Civil-day labels
// (relativeDayLabel / monthDayLabel / upcomingDays) operate on "YYYY-MM-DD" day
// keys, which are zone-agnostic once computed: a key is anchored at noon UTC, so
// formatting it in UTC yields that calendar day's weekday / month-day.

const DAY_MS = 86_400_000;
const pad2 = (n: number) => String(n).padStart(2, "0");

type SlotFmt = { date: Intl.DateTimeFormat; time: Intl.DateTimeFormat };
const slotFmtCache = new Map<string, SlotFmt>();

function slotFormatters(timeZone: string): SlotFmt {
  let fmt = slotFmtCache.get(timeZone);
  if (!fmt) {
    fmt = {
      date: new Intl.DateTimeFormat("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        timeZone,
      }),
      time: new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        minute: "2-digit",
        timeZone,
      }),
    };
    slotFmtCache.set(timeZone, fmt);
  }
  return fmt;
}

const FMT_MONTH_DAY = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});
const FMT_WEEKDAY_LONG = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  timeZone: "UTC",
});
const FMT_WEEKDAY_SHORT = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  timeZone: "UTC",
});

// Noon-UTC anchor for a "YYYY-MM-DD" day key (noon dodges any offset edge).
function civilNoon(dayKey: string): Date {
  return new Date(`${dayKey}T12:00:00Z`);
}

function dayKeyFromAnchor(anchor: Date): string {
  return `${anchor.getUTCFullYear()}-${pad2(anchor.getUTCMonth() + 1)}-${pad2(anchor.getUTCDate())}`;
}

function addCivilDays(dayKey: string, n: number): string {
  return dayKeyFromAnchor(new Date(civilNoon(dayKey).getTime() + n * DAY_MS));
}

// Labels + day key for a concrete instant, rendered in the viewer's zone.
export function formatSlotParts(
  date: Date,
  timeZone: string,
): { dateLabel: string; timeLabel: string; dayKey: string } {
  const fmt = slotFormatters(timeZone);
  return {
    dateLabel: fmt.date.format(date),
    timeLabel: fmt.time.format(date),
    dayKey: zonedDayKey(date, timeZone),
  };
}

export function relativeDayLabel(dayKey: string, todayKey: string): string {
  if (dayKey === todayKey) return "Today";
  if (dayKey === addCivilDays(todayKey, 1)) return "Tomorrow";
  return FMT_WEEKDAY_LONG.format(civilNoon(dayKey));
}

export function monthDayLabel(dayKey: string): string {
  return FMT_MONTH_DAY.format(civilNoon(dayKey));
}

// Day chips for the next `n` days, starting today in `timeZone`.
export function upcomingDays(
  n: number,
  timeZone: string,
): { dayKey: string; short: string; sub: string }[] {
  const today = zonedParts(new Date(), timeZone);
  const base = Date.UTC(today.year, today.month - 1, today.day, 12);
  return Array.from({ length: n }, (_, i) => {
    const anchor = new Date(base + i * DAY_MS);
    return {
      dayKey: dayKeyFromAnchor(anchor),
      short: i === 0 ? "Today" : FMT_WEEKDAY_SHORT.format(anchor),
      sub: FMT_MONTH_DAY.format(anchor),
    };
  });
}

export function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(date).toLocaleDateString();
}
