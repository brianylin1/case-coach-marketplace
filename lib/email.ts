// Booking notification emails via Resend, behind a thin abstraction (mirrors
// lib/payments.ts). Real sends happen only when RESEND_API_KEY is set AND we're
// in production — so the preview, which shares the prod DB, never emails real
// people. EMAIL_FORCE_SEND=1 overrides for deliberate local testing.
// Server-only.
import { Resend } from "resend";
import { BRAND, focusLabel, meetingPlatformLabel, SUPPORT_EMAIL } from "@/lib/constants";
import { formatSlotParts } from "@/lib/format";
import { shortOffsetLabel } from "@/lib/timezone";
import type { BookingMeeting } from "@/lib/ics";

// The sender display name recipients see is controlled by EMAIL_FROM in the
// environment (Vercel Production). This literal is only the local/dev fallback —
// keep it aligned with the brand.
const FROM = process.env.EMAIL_FROM ?? `${BRAND} <bookings@downtocase.com>`;

export type EmailResult = "SENT" | "SIMULATED" | "FAILED";

export type BookingEmailInput = {
  bookingId: number;
  start: Date;
  durationMins: number;
  coach: { name: string; email: string; timezone: string };
  student: { name: string; email: string };
  studentTimezone: string; // viewer zone captured at booking time (cc_tz cookie)
  focusArea: string | null;
  pricePaid: number; // retained for the call site; intentionally not shown to users
  meeting: BookingMeeting;
  ics: string; // the invite, attached to both emails
};

// Coach-provided meeting fields and user names are free text — escape before
// embedding in HTML.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function liveSendEnabled(): boolean {
  if (!process.env.RESEND_API_KEY) return false;
  return process.env.VERCEL_ENV === "production" || process.env.EMAIL_FORCE_SEND === "1";
}

function whenLabel(start: Date, tz: string): string {
  const { dateLabel, timeLabel } = formatSlotParts(start, tz);
  return `${dateLabel} · ${timeLabel} (${shortOffsetLabel(tz, start)})`;
}

type Row = { label: string; value: string };

function detailsTable(rows: Row[]): string {
  const cells = rows
    .map(
      (r, i) =>
        `<tr style="background:${i % 2 === 1 ? "#f8fafc" : "#ffffff"}">` +
        `<td style="padding:11px 16px;font-size:13px;color:#64748b;width:140px;vertical-align:top">${r.label}</td>` +
        `<td style="padding:11px 16px;font-size:14px;color:#0f172a;font-weight:500">${r.value}</td>` +
        `</tr>`,
    )
    .join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:separate;border-spacing:0;margin:20px 0;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">${cells}</table>`;
}

const CALENDAR_NOTE = "We attached a calendar invite with the session time and meeting details.";

// One booking email. `joinUrl` must already be HTML-escaped; `beforeSection.body`
// is trusted HTML (no user input).
function emailHtml(opts: {
  heading: string;
  intro: string;
  rows: Row[];
  joinUrl: string;
  beforeSection?: { title: string; body: string };
}): string {
  const before = opts.beforeSection
    ? `<h2 style="font-size:15px;font-weight:600;margin:24px 0 6px;color:#0f172a">${opts.beforeSection.title}</h2>
  <p style="font-size:14px;line-height:1.55;color:#475569;margin:0">${opts.beforeSection.body}</p>`
    : "";
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:12px;color:#0f172a">
  <div style="font-size:18px;font-weight:700;letter-spacing:-0.02em;color:#4f46e5">${BRAND}</div>
  <div style="width:44px;border-top:3px solid #4f46e5;margin:10px 0 22px"></div>
  <h1 style="font-size:22px;line-height:1.3;margin:0 0 8px;color:#0f172a">${opts.heading}</h1>
  <p style="font-size:15px;line-height:1.55;color:#475569;margin:0">${opts.intro}</p>
  ${detailsTable(opts.rows)}
  <a href="${opts.joinUrl}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 24px;border-radius:10px">Join the session</a>
  <p style="font-size:13px;line-height:1.5;color:#64748b;margin:14px 0 0">Button not working? Use this link:<br><a href="${opts.joinUrl}" style="color:#4f46e5;word-break:break-all">${opts.joinUrl}</a></p>
  ${before}
  <p style="font-size:13px;line-height:1.5;color:#64748b;margin:20px 0 0">${CALENDAR_NOTE}</p>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 16px">
  <p style="font-size:13px;line-height:1.5;color:#94a3b8;margin:0">Need help? Contact <a href="mailto:${SUPPORT_EMAIL}" style="color:#4f46e5;text-decoration:none">${SUPPORT_EMAIL}</a></p>
  <p style="font-size:12px;line-height:1.5;color:#cbd5e1;margin:8px 0 0">${BRAND} — 1:1 case-interview coaching with MBB consultants.</p>
</div>`;
}

function platformRow(m: BookingMeeting): Row {
  return { label: "Meeting platform", value: escapeHtml(meetingPlatformLabel(m.platform)) };
}

// Full meeting metadata for the student (who doesn't own the room): platform
// plus any ID / passcode / instructions.
function studentMeetingRows(m: BookingMeeting): Row[] {
  return [
    platformRow(m),
    ...(m.id ? [{ label: "Meeting ID", value: escapeHtml(m.id) }] : []),
    ...(m.passcode ? [{ label: "Passcode", value: escapeHtml(m.passcode) }] : []),
    ...(m.instructions ? [{ label: "Instructions", value: escapeHtml(m.instructions) }] : []),
  ];
}

function mailtoCell(email: string): string {
  const safe = escapeHtml(email);
  return `<a href="mailto:${safe}" style="color:#4f46e5;text-decoration:none">${safe}</a>`;
}

export type RenderedBookingEmails = {
  studentSubject: string;
  studentHtml: string;
  coachSubject: string;
  coachHtml: string;
};

// Pure render of both emails (subject + HTML). Exported separately from the send
// so the content can be previewed/tested without touching Resend.
export function renderBookingEmails(input: BookingEmailInput): RenderedBookingEmails {
  const focus = input.focusArea ? focusLabel(input.focusArea) : "Case coaching";
  const studentWhen = whenLabel(input.start, input.studentTimezone);
  const coachWhen = whenLabel(input.start, input.coach.timezone);
  const coachDate = formatSlotParts(input.start, input.coach.timezone).dateLabel;
  const joinUrl = escapeHtml(input.meeting.url);
  const coachName = escapeHtml(input.coach.name);
  const studentName = escapeHtml(input.student.name);
  const focusCell = escapeHtml(focus);

  // Student: trustworthy confirmation with full meeting details (they don't own
  // the room).
  const studentHtml = emailHtml({
    heading: "Your session is confirmed",
    intro: `You're booked with ${coachName} for a 1:1 case-interview session. Here are the details:`,
    rows: [
      { label: "Date & time", value: studentWhen },
      { label: "Coach", value: coachName },
      { label: "Focus", value: focusCell },
      ...studentMeetingRows(input.meeting),
      { label: "Coach email", value: mailtoCell(input.coach.email) },
    ],
    joinUrl,
  });

  // Coach: action-oriented — who booked, how to reach them, and what to do next.
  const coachHtml = emailHtml({
    heading: "Someone is down to case with you",
    intro: `${studentName} booked a 1:1 case coaching session with you. Here are the details.`,
    rows: [
      { label: "Date & time", value: coachWhen },
      { label: "Student", value: studentName },
      { label: "Student email", value: mailtoCell(input.student.email) },
      { label: "Focus", value: focusCell },
      platformRow(input.meeting),
    ],
    joinUrl,
    beforeSection: {
      title: "Before the session",
      body: `Use your reusable coaching room linked above. If anything changes, contact the student directly or email <a href="mailto:${SUPPORT_EMAIL}" style="color:#4f46e5;text-decoration:none">${SUPPORT_EMAIL}</a>.`,
    },
  });

  return {
    studentSubject: `Your ${BRAND} session with ${input.coach.name} is confirmed`,
    studentHtml,
    coachSubject: `Someone is down to case with you: ${input.student.name} on ${coachDate}`,
    coachHtml,
  };
}

export async function sendBookingEmails(input: BookingEmailInput): Promise<EmailResult> {
  const { studentSubject, studentHtml, coachSubject, coachHtml } = renderBookingEmails(input);
  const attachments = [{ filename: "invite.ics", content: Buffer.from(input.ics, "utf8") }];

  if (!liveSendEnabled()) {
    console.log(
      `[email:SIMULATED] booking ${input.bookingId}: -> ${input.student.email} & ${input.coach.email}; join ${input.meeting.url}`,
    );
    return "SIMULATED";
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    await resend.emails.send({
      from: FROM,
      to: input.student.email,
      subject: studentSubject,
      html: studentHtml,
      attachments,
    });
    await resend.emails.send({
      from: FROM,
      to: input.coach.email,
      subject: coachSubject,
      html: coachHtml,
      attachments,
    });
    return "SENT";
  } catch (err) {
    console.error(`[email:FAILED] booking ${input.bookingId}`, err);
    return "FAILED";
  }
}
