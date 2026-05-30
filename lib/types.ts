// Serializable shapes passed from server components to client components.
// Note: a coach's email is intentionally NOT included here — contact details
// are only revealed to a student after a booking is confirmed.

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
};

export type SlotView = {
  id: number;
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
