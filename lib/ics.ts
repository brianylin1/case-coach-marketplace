// Minimal RFC 5545 iCalendar builder for booking invites — no dependency. The
// only sharp edges are CRLF line endings, 75-octet line folding, and TEXT
// escaping, all handled here. Event times are emitted in UTC (Z), so every
// calendar client localizes to its own viewer. Server-only (uses Buffer).
import { BRAND, focusLabel, meetingLocationLabel, meetingPlatformLabel, SUPPORT_EMAIL } from "@/lib/constants";

// The ICS ORGANIZER receives attendee RSVPs (calendar METHOD:REPLY), so it must
// be a real, monitored mailbox — not the send-only From address
// (bookings@downtocase.com), which bounces RSVPs with "550 address does not
// exist". SUPPORT_EMAIL (support@downtocase.com) forwards to the operator.
const ORGANIZER_EMAIL = SUPPORT_EMAIL;

// Coach-provided meeting details, snapshotted onto the booking.
export type BookingMeeting = {
  platform: string | null;
  url: string;
  id: string | null;
  passcode: string | null;
  instructions: string | null;
};

export type IcsAttendee = { name: string; email: string };

export type IcsEvent = {
  uid: string;
  start: Date;
  durationMins: number;
  summary: string;
  description: string;
  htmlDescription?: string; // optional Outlook-friendly rich alternate (X-ALT-DESC)
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

// Escape user-provided text for embedding inside the X-ALT-DESC HTML payload.
function escHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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
    `PRODID:-//${BRAND}//Booking//EN`,
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
    // Rich HTML alternate for clients that support it (chiefly Outlook). The
    // plain DESCRIPTION above stays the source of truth for everyone else.
    ...(event.htmlDescription
      ? [fold(`X-ALT-DESC;FMTTYPE=text/html:${esc(event.htmlDescription)}`)]
      : []),
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
  meeting: BookingMeeting;
}): IcsEvent {
  const focus = input.focusArea ? focusLabel(input.focusArea) : "Case coaching";
  const m = input.meeting;
  const platformLabel = meetingPlatformLabel(m.platform);

  // Plain-text DESCRIPTION (source of truth for every client). No date/time here
  // on purpose — the calendar localizes DTSTART/DTEND per viewer; a baked-in time
  // would only introduce timezone ambiguity.
  const lines: string[] = [
    `Hey ${input.studentName} and ${input.coachName},`,
    ``,
    `Your 1:1 case coaching session is booked. You'll find the session details below. Have a great case!`,
    ``,
    `Session details`,
    ``,
    `Coach`,
    input.coachName,
    ``,
    `Student`,
    input.studentName,
    ``,
    `Focus Area`,
    focus,
    ``,
    `Meeting Platform`,
    platformLabel,
  ];
  if (m.id) lines.push(``, `Meeting ID`, m.id);
  if (m.passcode) lines.push(``, `Passcode`, m.passcode);
  if (m.instructions) lines.push(``, `Joining Instructions`, m.instructions);
  lines.push(
    ``,
    `Join the session:`,
    m.url,
    ``,
    `Need help?`,
    SUPPORT_EMAIL,
    ``,
    BRAND,
  );
  const description = lines.join("\n");

  // Outlook-friendly HTML alternate, mirroring the plain text + the email layout.
  const sName = escHtml(input.studentName);
  const cName = escHtml(input.coachName);
  const detailRow = (label: string, value: string) =>
    `<tr><td style="padding:3px 16px 3px 0;color:#64748b;white-space:nowrap;vertical-align:top">${label}</td>` +
    `<td style="padding:3px 0;font-weight:500">${value}</td></tr>`;
  const detailRows = [
    detailRow("Coach", cName),
    detailRow("Student", sName),
    detailRow("Focus Area", escHtml(focus)),
    detailRow("Meeting Platform", escHtml(platformLabel)),
    ...(m.id ? [detailRow("Meeting ID", escHtml(m.id))] : []),
    ...(m.passcode ? [detailRow("Passcode", escHtml(m.passcode))] : []),
    ...(m.instructions ? [detailRow("Joining Instructions", escHtml(m.instructions))] : []),
  ].join("");
  const htmlDescription =
    `<html><body style="font-family:-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;font-size:14px;line-height:1.5">` +
    `<div style="font-size:18px;font-weight:700;color:#4f46e5">${BRAND}</div>` +
    `<p style="margin:12px 0 0">Hey ${sName} and ${cName},</p>` +
    `<p style="margin:8px 0 0">Your 1:1 case coaching session is booked. You'll find the session details below. Have a great case!</p>` +
    `<h3 style="font-size:14px;font-weight:600;margin:18px 0 6px">Session details</h3>` +
    `<table style="border-collapse:collapse;font-size:14px">${detailRows}</table>` +
    `<p style="margin:16px 0 0"><a href="${escHtml(m.url)}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-weight:600;padding:10px 18px;border-radius:8px">Join Session</a></p>` +
    `<p style="margin:14px 0 0;color:#64748b">Need help? <a href="mailto:${SUPPORT_EMAIL}" style="color:#4f46e5;text-decoration:none">${SUPPORT_EMAIL}</a></p>` +
    `<p style="margin:16px 0 0;color:#94a3b8;font-size:12px">${BRAND}</p>` +
    `</body></html>`;

  return {
    // UID stays on the original domain so already-issued invites update in place
    // (it's an opaque identifier, never shown to users) — not a branding string.
    uid: `booking-${input.bookingId}@casecoach.app`,
    start: input.start,
    durationMins: input.durationMins,
    summary: `${input.studentName} and ${input.coachName} are ${BRAND}!`,
    description,
    htmlDescription,
    // A human-friendly location (the platform name) rather than the raw URL, so
    // Gmail/Outlook don't render the join link as a physical place. The link is
    // in the description above (and the email's Join button).
    location: meetingLocationLabel(m.platform),
    organizer: { name: BRAND, email: ORGANIZER_EMAIL },
    attendees: [
      { name: input.studentName, email: input.studentEmail },
      { name: input.coachName, email: input.coachEmail },
    ],
    sequence: 0,
    reminderMinutes: 60,
  };
}
