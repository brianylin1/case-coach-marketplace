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
