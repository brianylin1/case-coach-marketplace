// Timezone helpers built on the Intl API. The full IANA database + DST rules
// ship with Node 20 and every modern browser, so there's no external dependency
// (and the Temporal API isn't stable yet). Pure — safe to import from both
// server and client components.
//
// Model: a coach authors availability as WALL-CLOCK time in their IANA zone;
// Booking.startTime and every generated session start are absolute UTC instants.
// These helpers convert an instant -> wall-clock parts in a zone, and a
// wall-clock time in a zone -> the absolute instant (DST-correct).

// Cookie carrying the viewer's detected IANA zone: set client-side (see
// components/TimezoneSync), read by server components / route handlers. A
// display preference only — never persisted to an account.
export const TZ_COOKIE = "cc_tz";

export type ZonedParts = {
  year: number;
  month: number; // 1–12
  day: number; // 1–31
  hour: number; // 0–23
  minute: number; // 0–59
  weekdayMon0: number; // 0=Mon … 6=Sun
};

const WEEKDAY_MON0: Record<string, number> = {
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
};

const partsCache = new Map<string, Intl.DateTimeFormat>();

function partsFormatter(timeZone: string): Intl.DateTimeFormat {
  let fmt = partsCache.get(timeZone);
  if (!fmt) {
    fmt = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      weekday: "short",
    });
    partsCache.set(timeZone, fmt);
  }
  return fmt;
}

// Wall-clock parts of an absolute instant, as read in `timeZone`.
export function zonedParts(date: Date, timeZone: string): ZonedParts {
  const map: Record<string, string> = {};
  for (const part of partsFormatter(timeZone).formatToParts(date)) {
    if (part.type !== "literal") map[part.type] = part.value;
  }
  let hour = Number(map.hour);
  if (hour === 24) hour = 0; // some ICU builds emit "24" for midnight under h23
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour,
    minute: Number(map.minute),
    weekdayMon0: WEEKDAY_MON0[map.weekday] ?? 0,
  };
}

// Offset of `timeZone` at `date`, in whole minutes (localWallClock − UTC). We
// compare instants truncated to the minute since offsets are minute-aligned.
function offsetMinutes(date: Date, timeZone: string): number {
  const p = zonedParts(date, timeZone);
  const asUTC = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute);
  const instantMinute = Math.floor(date.getTime() / 60000) * 60000;
  return (asUTC - instantMinute) / 60000;
}

// The absolute instant for a wall-clock time in `timeZone`. Returns null when
// that wall time doesn't exist (the spring-forward gap hour). For a fall-back
// overlap (a wall time that happens twice) it returns the earlier instant.
// DST-correct because the offset is resolved at that specific date.
export function wallTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): Date | null {
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const o1 = offsetMinutes(new Date(guess), timeZone);
  let utc = guess - o1 * 60000;
  const o2 = offsetMinutes(new Date(utc), timeZone);
  if (o2 !== o1) utc = guess - o2 * 60000;
  // If the requested wall time doesn't round-trip, it falls in a DST gap.
  const back = zonedParts(new Date(utc), timeZone);
  if (
    back.year !== year ||
    back.month !== month ||
    back.day !== day ||
    back.hour !== hour ||
    back.minute !== minute
  ) {
    return null;
  }
  return new Date(utc);
}

// Local midnight (00:00 in `timeZone`) of a calendar date, as an instant.
// Tolerant of the rare zone whose midnight lands in a DST gap.
export function zonedMidnightOf(
  year: number,
  month: number,
  day: number,
  timeZone: string,
): Date {
  const guess = Date.UTC(year, month - 1, day);
  const o = offsetMinutes(new Date(guess), timeZone);
  return new Date(guess - o * 60000);
}

// Weekday (0=Mon … 6=Sun) of a calendar date — independent of any zone.
export function civilWeekdayMon0(year: number, month: number, day: number): number {
  return (new Date(Date.UTC(year, month - 1, day)).getUTCDay() + 6) % 7;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

// "YYYY-MM-DD" of an instant as seen in `timeZone` (its local calendar day).
export function zonedDayKey(date: Date, timeZone: string): string {
  const p = zonedParts(date, timeZone);
  return `${p.year}-${pad2(p.month)}-${pad2(p.day)}`;
}

// Does this runtime recognize `tz` as a valid IANA zone? (Accepts any zone, not
// just the curated list below.)
export function isValidTimeZone(tz: unknown): tz is string {
  if (typeof tz !== "string" || tz.length === 0) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

// Short UTC-offset label for a zone at a moment, e.g. "GMT-4". Display only.
export function shortOffsetLabel(timeZone: string, at: Date = new Date()): string {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      timeZoneName: "shortOffset",
    }).formatToParts(at);
    return parts.find((p) => p.type === "timeZoneName")?.value ?? timeZone;
  } catch {
    return timeZone;
  }
}

// Curated zones for the coach picker. Validation accepts any IANA zone, so a
// coach whose detected zone isn't listed can still be saved.
export const COMMON_TIMEZONES: { value: string; label: string }[] = [
  { value: "America/Los_Angeles", label: "Pacific Time — Los Angeles" },
  { value: "America/Denver", label: "Mountain Time — Denver" },
  { value: "America/Chicago", label: "Central Time — Chicago" },
  { value: "America/New_York", label: "Eastern Time — New York" },
  { value: "America/Sao_Paulo", label: "Brazil — São Paulo" },
  { value: "Europe/London", label: "UK — London" },
  { value: "Europe/Paris", label: "Central Europe — Paris" },
  { value: "Europe/Berlin", label: "Central Europe — Berlin" },
  { value: "Africa/Lagos", label: "West Africa — Lagos" },
  { value: "Asia/Dubai", label: "Gulf — Dubai" },
  { value: "Asia/Kolkata", label: "India — Kolkata" },
  { value: "Asia/Singapore", label: "Singapore" },
  { value: "Asia/Tokyo", label: "Japan — Tokyo" },
  { value: "Australia/Sydney", label: "Australia — Sydney" },
  { value: "UTC", label: "UTC" },
];
