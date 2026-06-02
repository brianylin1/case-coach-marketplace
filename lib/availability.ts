// Recurring weekly availability + on-the-fly session generation.
//
// A coach paints a weekly grid (AvailabilityBlock rows: weekday 0=Mon…6=Sun,
// start/endMinute = minutes from midnight). Those minutes are WALL-CLOCK time in
// the coach's IANA timezone. Concrete bookable 60-min session starts are
// generated on the fly as absolute UTC instants, DST-correct (see lib/timezone).

import {
  civilWeekdayMon0,
  wallTimeToUtc,
  zonedMidnightOf,
  zonedParts,
} from "@/lib/timezone";

export const GRID_START_HOUR = 7; // first cell covers 7:00–8:00
export const GRID_END_HOUR = 22; // last cell covers 21:00–22:00 (exclusive)
export const SESSION_MINUTES = 60;
export const BOOKING_HORIZON_DAYS = 7;

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const DAY_MS = 86_400_000;

export function gridHours(): number[] {
  return Array.from(
    { length: GRID_END_HOUR - GRID_START_HOUR },
    (_, i) => GRID_START_HOUR + i,
  );
}

export type BlockInput = { weekday: number; startMinute: number; endMinute: number };

// Map weekday -> set of whole on-the-hour starts that fit inside its blocks.
function hoursByWeekday(blocks: BlockInput[]): Map<number, Set<number>> {
  const map = new Map<number, Set<number>>();
  for (const block of blocks) {
    const hours = map.get(block.weekday) ?? new Set<number>();
    for (let m = block.startMinute; m + SESSION_MINUTES <= block.endMinute; m += 60) {
      hours.add(Math.floor(m / 60));
    }
    map.set(block.weekday, hours);
  }
  return map;
}

// Expand weekly blocks into concrete UTC session starts within [from, to). The
// block hours are wall-clock in `timeZone`; each occurrence is converted to its
// UTC instant on that specific date, so DST shifts are handled. Hourly, on the
// (local) hour. Does not exclude past/booked — the caller does that.
export function coachSessionStarts(
  blocks: BlockInput[],
  from: Date,
  to: Date,
  timeZone: string,
): Date[] {
  if (blocks.length === 0) return [];
  const hours = hoursByWeekday(blocks);

  const fromCivil = zonedParts(from, timeZone);
  const toCivil = zonedParts(to, timeZone);
  // Iterate candidate local calendar days, padded ±1 day so conversions near
  // the window edges aren't missed; the [from, to) filter keeps the result tight.
  let cursor = Date.UTC(fromCivil.year, fromCivil.month - 1, fromCivil.day, 12) - DAY_MS;
  const end = Date.UTC(toCivil.year, toCivil.month - 1, toCivil.day, 12) + DAY_MS;

  const starts: Date[] = [];
  for (; cursor <= end; cursor += DAY_MS) {
    const d = new Date(cursor);
    const year = d.getUTCFullYear();
    const month = d.getUTCMonth() + 1;
    const day = d.getUTCDate();
    const dayHours = hours.get(civilWeekdayMon0(year, month, day));
    if (!dayHours) continue;
    for (const hour of dayHours) {
      const start = wallTimeToUtc(year, month, day, hour, 0, timeZone);
      if (start && start >= from && start < to) starts.push(start);
    }
  }
  starts.sort((a, b) => a.getTime() - b.getTime());
  return starts;
}

// Does a concrete instant land on the (local) hour inside the coach's weekly
// blocks, in `timeZone`? This is the authority for "is this a real session
// start" — callers no longer need a separate UTC on-the-hour check.
export function isStartWithinBlocks(
  blocks: BlockInput[],
  start: Date,
  timeZone: string,
): boolean {
  const p = zonedParts(start, timeZone);
  if (p.minute !== 0) return false; // sessions sit on the local hour
  const minute = p.hour * 60;
  return blocks.some(
    (b) =>
      b.weekday === p.weekdayMon0 &&
      minute >= b.startMinute &&
      minute + SESSION_MINUTES <= b.endMinute,
  );
}

// The bookable window for a viewer in `timeZone`: from now to local midnight
// BOOKING_HORIZON_DAYS out. Generation + calendar bucketing share these bounds.
export function bookingWindow(
  now: Date,
  timeZone: string,
): { lower: Date; upper: Date } {
  const today = zonedParts(now, timeZone);
  const horizon = new Date(
    Date.UTC(today.year, today.month - 1, today.day, 12) + BOOKING_HORIZON_DAYS * DAY_MS,
  );
  const upper = zonedMidnightOf(
    horizon.getUTCFullYear(),
    horizon.getUTCMonth() + 1,
    horizon.getUTCDate(),
    timeZone,
  );
  return { lower: now, upper };
}

// Visible calendar rows: the fixed 7am–10pm window, widened to a contiguous
// range that still covers any local hour with supply, so cross-timezone
// availability is never hidden. Defaults to exactly 7am–10pm when supply fits.
export function calendarHours(populatedHours: number[]): number[] {
  let lo = GRID_START_HOUR;
  let hi = GRID_END_HOUR - 1;
  for (const h of populatedHours) {
    if (h < lo) lo = h;
    if (h > hi) hi = h;
  }
  return Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
}

// Merge painted {weekday, hour} cells into contiguous blocks for storage.
export function cellsToBlocks(
  cells: { weekday: number; hour: number }[],
): BlockInput[] {
  const hoursByDay = new Map<number, number[]>();
  for (const cell of cells) {
    const arr = hoursByDay.get(cell.weekday) ?? [];
    arr.push(cell.hour);
    hoursByDay.set(cell.weekday, arr);
  }

  const blocks: BlockInput[] = [];
  for (const [weekday, raw] of hoursByDay) {
    const hours = [...new Set(raw)].sort((a, b) => a - b);
    let runStart = hours[0];
    let prev = hours[0];
    for (let i = 1; i <= hours.length; i++) {
      if (hours[i] === prev + 1) {
        prev = hours[i];
      } else {
        blocks.push({
          weekday,
          startMinute: runStart * 60,
          endMinute: (prev + 1) * 60,
        });
        runStart = hours[i];
        prev = hours[i];
      }
    }
  }
  return blocks;
}

// Expand blocks into the set of "weekday-hour" cell keys (to seed the grid).
export function blocksToCellKeys(blocks: BlockInput[]): string[] {
  const keys: string[] = [];
  for (const block of blocks) {
    for (
      let hour = Math.floor(block.startMinute / 60);
      hour < Math.floor(block.endMinute / 60);
      hour++
    ) {
      keys.push(`${block.weekday}-${hour}`);
    }
  }
  return keys;
}
