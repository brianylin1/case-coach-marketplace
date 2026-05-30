import { formatSlotParts, parseList } from "@/lib/format";
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

type SlotRow = {
  id: number;
  startTime: Date;
  durationMins: number;
  coach: CoachRow;
};

export function toSlotView(slot: SlotRow): SlotView {
  const parts = formatSlotParts(slot.startTime);
  return {
    id: slot.id,
    startISO: new Date(slot.startTime).toISOString(),
    dateLabel: parts.dateLabel,
    timeLabel: parts.timeLabel,
    dayKey: parts.dayKey,
    durationMins: slot.durationMins,
    coach: toCoachView(slot.coach),
  };
}
