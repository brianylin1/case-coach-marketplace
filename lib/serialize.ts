import { formatSlotParts, parseList } from "@/lib/format";
import { SESSION_MINUTES } from "@/lib/availability";
import type { CoachView, SlotView } from "@/lib/types";

type CoachRow = {
  id: number;
  name: string;
  firm: string;
  title: string;
  yearsAtFirm: number;
  headline: string | null;
  bio: string;
  focusAreas: string;
  hourlyRate: number;
  availability: string | null;
  linkedinUrl: string | null;
};

export function toCoachView(coach: CoachRow): CoachView {
  return {
    id: coach.id,
    name: coach.name,
    firm: coach.firm,
    title: coach.title,
    yearsAtFirm: coach.yearsAtFirm,
    headline: coach.headline,
    bio: coach.bio,
    focusKeys: parseList(coach.focusAreas),
    hourlyRate: coach.hourlyRate,
    availability: coach.availability,
    linkedinUrl: coach.linkedinUrl,
  };
}

// Build a bookable-session view from a coach and a concrete UTC start time.
// Labels render in `viewerTimeZone` (the student's local zone).
export function toSessionView(
  coach: CoachRow,
  start: Date,
  viewerTimeZone: string,
): SlotView {
  const startISO = new Date(start).toISOString();
  const parts = formatSlotParts(start, viewerTimeZone);
  return {
    key: `${coach.id}:${startISO}`,
    startISO,
    dateLabel: parts.dateLabel,
    timeLabel: parts.timeLabel,
    dayKey: parts.dayKey,
    durationMins: SESSION_MINUTES,
    coach: toCoachView(coach),
  };
}
