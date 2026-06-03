// Minimal RFC 5545 iCalendar builder for booking invites — no dependency. The
// only sharp edges are CRLF line endings, 75-octet line folding, and TEXT
// escaping, all handled here. Event times are emitted in UTC (Z), so every
// calendar client localizes to its own viewer. Server-only (uses Buffer).
import { focusLabel } from "@/lib/constants";
import { isJitsiUrl } from "@/lib/calendar-links";

const ORGANIZER_EMAIL = process.env.EMAIL_FROM_ADDRESS ?? "bookings@casecoach.app";

export type IcsAttendee = { name: string; email: string };

export type IcsEvent = {
  uid: string;
  start: Date;
  durationMins: number;
  summary: string;
  description: string;
  location: string;
  organizer: { name: string; email: string };
  attendees: IcsAttendee[];
  sequence?: number;
  reminderMinutes?: number; // minutes before start for a VALARM; omit for none
};

const pad = (n: number) => String(n).padStart(2, "0");

// UTC stamp: YYYYMMDDTHHMMSSZ
function utcStamp(date: Date): string {
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}

// Escape a TEXT value per RFC 5545 §3.3.11.
function esc(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

// Quote a parameter value (CN); strip embedded quotes since they can't be escaped.
function quoteParam(value: string): string {
  return `"${value.replace(/"/g, "")}"`;
}

// Fold a content line at 75 octets; continuation lines begin with a single space.
function fold(line: string): string {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;
  const chunks: string[] = [];
  let start = 0;
  let limit = 75;
  while (start < bytes.length) {
    let end = Math.min(start + limit, bytes.length);
    // Don't split a multi-byte UTF-8 sequence: back off to a char boundary.
    while (end < bytes.length && (bytes[end] & 0xc0) === 0x80) end--;
    chunks.push(bytes.subarray(start, end).toString("utf8"));
    start = end;
    limit = 74; // leading space on continuation lines counts toward the 75
  }
  return chunks.join("\r\n ");
}

const kv = (name: string, value: string) => fold(`${name}:${value}`);

export function buildIcs(
  event: IcsEvent,
  method: "REQUEST" | "CANCEL" = "REQUEST",
): string {
  const end = new Date(event.start.getTime() + event.durationMins * 60_000);
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CaseCoach//Booking//EN",
    "CALSCALE:GREGORIAN",
    `METHOD:${method}`,
    "BEGIN:VEVENT",
    kv("UID", event.uid),
    `SEQUENCE:${event.sequence ?? 0}`,
    `DTSTAMP:${utcStamp(new Date())}`,
    `DTSTART:${utcStamp(event.start)}`,
    `DTEND:${utcStamp(end)}`,
    kv("SUMMARY", esc(event.summary)),
    kv("DESCRIPTION", esc(event.description)),
    kv("LOCATION", esc(event.location)),
    "STATUS:CONFIRMED",
    "TRANSP:OPAQUE",
    fold(`ORGANIZER;CN=${quoteParam(event.organizer.name)}:mailto:${event.organizer.email}`),
  ];
  for (const a of event.attendees) {
    lines.push(
      fold(
        `ATTENDEE;CN=${quoteParam(a.name)};ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${a.email}`,
      ),
    );
  }
  if (event.reminderMinutes && event.reminderMinutes > 0) {
    lines.push(
      "BEGIN:VALARM",
      "ACTION:DISPLAY",
      "DESCRIPTION:Reminder",
      `TRIGGER:-PT${event.reminderMinutes}M`,
      "END:VALARM",
    );
  }
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

// Compose the canonical VEVENT for a booking — shared by the email attachment
// and the download endpoint so they always match.
export function buildBookingEvent(input: {
  bookingId: number;
  start: Date;
  durationMins: number;
  coachName: string;
  coachEmail: string;
  studentName: string;
  studentEmail: string;
  focusArea: string | null;
  meetingUrl: string;
}): IcsEvent {
  const focus = input.focusArea ? focusLabel(input.focusArea) : "Case coaching";
  return {
    uid: `booking-${input.bookingId}@casecoach.app`,
    start: input.start,
    durationMins: input.durationMins,
    summary: `CaseCoach: case session — ${input.studentName} × ${input.coachName}`,
    description:
      `Your CaseCoach 1:1 case-interview session.\n` +
      `Focus: ${focus}\n` +
      `Join: ${input.meetingUrl}\n` +
      (isJitsiUrl(input.meetingUrl)
        ? `If prompted, sign in with Google to start the room.\n`
        : ``) +
      `\nStudent: ${input.studentName}\n` +
      `Coach: ${input.coachName}\n\n` +
      `Booked via CaseCoach.`,
    location: input.meetingUrl,
    organizer: { name: "CaseCoach", email: ORGANIZER_EMAIL },
    attendees: [
      { name: input.studentName, email: input.studentEmail },
      { name: input.coachName, email: input.coachEmail },
    ],
    sequence: 0,
    reminderMinutes: 60,
  };
}
