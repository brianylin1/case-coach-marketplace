// Recurring weekly availability + on-the-fly session generation.
// weekday: 0 = Mon … 6 = Sun. All times are UTC for now (timezone picker later).

export const GRID_START_HOUR = 7; // first cell covers 7:00–8:00
export const GRID_END_HOUR = 22; // last cell covers 21:00–22:00 (exclusive)
export const SESSION_MINUTES = 60;
export const BOOKING_HORIZON_DAYS = 7;

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function gridHours(): number[] {
  return Array.from(
    { length: GRID_END_HOUR - GRID_START_HOUR },
    (_, i) => GRID_START_HOUR + i,
  );
}

// JS getUTCDay() is 0=Sun..6=Sat; convert to our 0=Mon..6=Sun.
export function weekdayMon0(date: Date): number {
  return (date.getUTCDay() + 6) % 7;
}

export type BlockInput = { weekday: number; startMinute: number; endMinute: number };

// Expand weekly blocks into concrete UTC session starts within [from, to).
// Hourly, on the hour. Does not exclude past/booked — the caller does that.
export function coachSessionStarts(
  blocks: BlockInput[],
  from: Date,
  to: Date,
): Date[] {
  if (blocks.length === 0) return [];

  const hoursByWeekday = new Map<number, Set<number>>();
  for (const block of blocks) {
    const hours = hoursByWeekday.get(block.weekday) ?? new Set<number>();
    for (let m = block.startMinute; m + SESSION_MINUTES <= block.endMinute; m += 60) {
      hours.add(Math.floor(m / 60));
    }
    hoursByWeekday.set(block.weekday, hours);
  }

  const starts: Date[] = [];
  const day = new Date(from);
  day.setUTCHours(0, 0, 0, 0);
  for (; day < to; day.setUTCDate(day.getUTCDate() + 1)) {
    const hours = hoursByWeekday.get(weekdayMon0(day));
    if (!hours) continue;
    for (const hour of hours) {
      const start = new Date(day);
      start.setUTCHours(hour, 0, 0, 0);
      if (start >= from && start < to) starts.push(start);
    }
  }
  starts.sort((a, b) => a.getTime() - b.getTime());
  return starts;
}

// Does a concrete on-the-hour start fall inside the coach's weekly blocks?
export function isStartWithinBlocks(blocks: BlockInput[], start: Date): boolean {
  const weekday = weekdayMon0(start);
  const minute = start.getUTCHours() * 60 + start.getUTCMinutes();
  return blocks.some(
    (b) =>
      b.weekday === weekday &&
      minute >= b.startMinute &&
      minute + SESSION_MINUTES <= b.endMinute,
  );
}

// Merge painted {weekday, hour} cells into contiguous blocks for storage.
export function cellsToBlocks(
  cells: { weekday: number; hour: number }[],
): BlockInput[] {
  const hoursByWeekday = new Map<number, number[]>();
  for (const cell of cells) {
    const arr = hoursByWeekday.get(cell.weekday) ?? [];
    arr.push(cell.hour);
    hoursByWeekday.set(cell.weekday, arr);
  }

  const blocks: BlockInput[] = [];
  for (const [weekday, raw] of hoursByWeekday) {
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
