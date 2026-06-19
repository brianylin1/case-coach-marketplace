// Serializable shapes passed from server components to client components.
// A coach's email is intentionally NOT included — contact details are only
// revealed to a student after a booking is confirmed.

export type CoachView = {
  id: number;
  name: string;
  firm: string;
  title: string;
  yearsAtFirm: number;
  headline: string | null;
  bio: string;
  focusKeys: string[];
  hourlyRate: number;
  availability: string | null;
  linkedinUrl: string | null;
  bestFor: string | null; // BEST_FOR key; fallback derived from focusKeys
  casesCoached: string | null; // CASES_COACHED bucket key; omitted when unset
  firmStatus: string | null; // "incoming" | "current" | "former" | null (unstated)
  photoUrl: string | null; // external image URL; falls back to initials avatar
};

// A bookable 60-min session, generated on the fly from a coach's availability.
// Identified by coach + start time (there are no stored slot rows).
export type SlotView = {
  key: string; // `${coachId}:${startISO}` — stable React key
  startISO: string;
  dateLabel: string; // "Sat, May 31"
  timeLabel: string; // "2:00 PM"
  dayKey: string; // "2026-05-31"
  durationMins: number;
  coach: CoachView;
};

export type DaySection = {
  dayKey: string;
  label: string; // "Today" | "Tomorrow" | "Saturday"
  dateLabel: string; // "May 31"
  slots: SlotView[];
};

// One cell of the weekly calendar: a specific day + hour. Lightweight — the
// full coach list is fetched on click (see /api/sessions/cell).
export type CalendarCell = {
  dayKey: string;
  hour: number; // 0–23 (UTC)
  count: number; // coaches available
  firms: string[]; // distinct firms present, ordered by the FIRMS list
};
