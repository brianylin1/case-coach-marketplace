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
        `<td style="padding:11px 16px;font-size:13px;color:#64748b;width:150px;vertical-align:top">${r.label}</td>` +
        `<td style="padding:11px 16px;font-size:14px;color:#0f172a;font-weight:500">${r.value}</td>` +
        `</tr>`,
    )
    .join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:separate;border-spacing:0;margin:8px 0 18px;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">${cells}</table>`;
}

const CALENDAR_NOTE = "We've attached a calendar invite with the session details.";
const sectionHeading = (text: string) =>
  `<h2 style="font-size:15px;font-weight:600;margin:24px 0 8px;color:#0f172a">${text}</h2>`;

// One booking email. `joinUrl` must already be HTML-escaped; `section.body` is
// trusted HTML (no user input).
function emailHtml(opts: {
  intro: string;
  rows: Row[];
  joinUrl: string;
  section: { title: string; body: string };
  tagline: string;
}): string {
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:12px;color:#0f172a">
  <div style="font-size:18px;font-weight:700;letter-spacing:-0.02em;color:#4f46e5">${BRAND}</div>
  <div style="width:44px;border-top:3px solid #4f46e5;margin:10px 0 22px"></div>
  <p style="font-size:15px;line-height:1.55;color:#475569;margin:0">${opts.intro}</p>
  ${sectionHeading("Session details")}
  ${detailsTable(opts.rows)}
  <a href="${opts.joinUrl}" style="display:inline-block;background:#4f46e5;color:#ffffff;text-decoration:none;font-weight:600;font-size:15px;padding:12px 24px;border-radius:10px">Join the Session</a>
  <p style="font-size:13px;line-height:1.5;color:#64748b;margin:14px 0 0">Button not working? Use this link:<br><a href="${opts.joinUrl}" style="color:#4f46e5;word-break:break-all">${opts.joinUrl}</a></p>
  ${sectionHeading(opts.section.title)}
  ${opts.section.body}
  <p style="font-size:13px;line-height:1.5;color:#64748b;margin:20px 0 0">${CALENDAR_NOTE}</p>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0 16px">
  <p style="font-size:13px;line-height:1.5;color:#475569;margin:0">Need help?<br><a href="mailto:${SUPPORT_EMAIL}" style="color:#4f46e5;text-decoration:none">${SUPPORT_EMAIL}</a></p>
  <p style="font-size:12px;line-height:1.5;color:#94a3b8;margin:14px 0 0"><strong style="color:#64748b">${BRAND}</strong><br>${opts.tagline}</p>
</div>`;
}

// Full meeting metadata, shown to both parties (platform + any ID / passcode /
// joining instructions).
function meetingRows(m: BookingMeeting): Row[] {
  return [
    { label: "Meeting Platform", value: escapeHtml(meetingPlatformLabel(m.platform)) },
    ...(m.id ? [{ label: "Meeting ID", value: escapeHtml(m.id) }] : []),
    ...(m.passcode ? [{ label: "Passcode", value: escapeHtml(m.passcode) }] : []),
    ...(m.instructions ? [{ label: "Joining Instructions", value: escapeHtml(m.instructions) }] : []),
  ];
}

function mailtoCell(email: string): string {
  const safe = escapeHtml(email);
  return `<a href="mailto:${safe}" style="color:#4f46e5;text-decoration:none">${safe}</a>`;
}

const para = (html: string, mb = 0) =>
  `<p style="font-size:14px;line-height:1.55;color:#475569;margin:0 0 ${mb}px">${html}</p>`;

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
  const studentDate = formatSlotParts(input.start, input.studentTimezone).dateLabel;
  const joinUrl = escapeHtml(input.meeting.url);
  const coachName = escapeHtml(input.coach.name);
  const studentName = escapeHtml(input.student.name);
  const focusCell = escapeHtml(focus);
  const mRows = meetingRows(input.meeting);

  // Coach: action-oriented — who booked, how to reach them, prep, and next steps.
  const coachHtml = emailHtml({
    intro: `Great news! ${studentName} just booked a 1:1 case coaching session with you. Everything you need to join and prepare for the session is below.`,
    rows: [
      { label: "Date & Time", value: coachWhen },
      { label: "Student", value: studentName },
      { label: "Student Email", value: mailtoCell(input.student.email) },
      { label: "Focus Area", value: focusCell },
      ...mRows,
    ],
    joinUrl,
    section: {
      title: "Before you join",
      body:
        para(
          "Take a quick look at the focus area above so you can jump straight into the case. Use your reusable coaching room linked above and be ready to kick things off at the scheduled time.",
          10,
        ) +
        para(
          `If anything changes, contact the student directly or reach us at <a href="mailto:${SUPPORT_EMAIL}" style="color:#4f46e5;text-decoration:none">${SUPPORT_EMAIL}</a>.`,
        ),
    },
    tagline: "Case coaching with consultants who've sat in the chair.",
  });

  // Student: polished, trustworthy confirmation with full join details.
  const studentHtml = emailHtml({
    intro: `Great news! Your session with ${coachName} is confirmed. The calendar invite is attached and everything you need to join is below.`,
    rows: [
      { label: "Date & Time", value: studentWhen },
      { label: "Coach", value: coachName },
      { label: "Focus Area", value: focusCell },
      ...mRows,
      { label: "Coach Email", value: mailtoCell(input.coach.email) },
    ],
    joinUrl,
    section: {
      title: "Come ready to case",
      body: para(
        "Whether you're working on structuring, market sizing, profitability, PEI, final-round prep, or just building confidence under pressure, show up with one thing you want to improve and your coach will take it from there.",
      ),
    },
    tagline: "Book coaching when you're ready to practice.",
  });

  return {
    studentSubject: `Someone's down to case! - ${input.coach.name} will case you on ${studentDate}`,
    studentHtml,
    coachSubject: `Someone's down to case! - ${input.student.name} booked ${coachDate}`,
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
