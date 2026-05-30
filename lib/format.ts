// Helpers for the JSON-string list columns and display formatting.
// Safe to import from both client and server components.

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

// ----- Slot / calendar formatting (all in UTC for determinism) -----

const FMT_SHORT_DATE = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});
const FMT_TIME = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  minute: "2-digit",
  timeZone: "UTC",
});
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

export function startOfUtcDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

export function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}

export function dayKeyOf(date: Date): string {
  return new Date(date).toISOString().slice(0, 10);
}

export function formatSlotParts(date: Date): {
  dateLabel: string;
  timeLabel: string;
  dayKey: string;
} {
  return {
    dateLabel: FMT_SHORT_DATE.format(date),
    timeLabel: FMT_TIME.format(date),
    dayKey: dayKeyOf(date),
  };
}

export function relativeDayLabel(dayKey: string, todayKey: string): string {
  if (dayKey === todayKey) return "Today";
  const tomorrowKey = dayKeyOf(addDays(new Date(`${todayKey}T00:00:00Z`), 1));
  if (dayKey === tomorrowKey) return "Tomorrow";
  return FMT_WEEKDAY_LONG.format(new Date(`${dayKey}T00:00:00Z`));
}

export function monthDayLabel(dayKey: string): string {
  return FMT_MONTH_DAY.format(new Date(`${dayKey}T00:00:00Z`));
}

// Day chips for the next `n` days, starting today (UTC).
export function upcomingDays(
  n: number,
): { dayKey: string; short: string; sub: string }[] {
  const today = startOfUtcDay(new Date());
  return Array.from({ length: n }, (_, i) => {
    const d = addDays(today, i);
    return {
      dayKey: dayKeyOf(d),
      short: i === 0 ? "Today" : FMT_WEEKDAY_SHORT.format(d),
      sub: FMT_MONTH_DAY.format(d),
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
