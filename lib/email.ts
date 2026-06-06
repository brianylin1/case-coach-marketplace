// Booking notification emails via Resend, behind a thin abstraction (mirrors
// lib/payments.ts). Real sends happen only when RESEND_API_KEY is set AND we're
// in production — so the preview, which shares the prod DB, never emails real
// people. EMAIL_FORCE_SEND=1 overrides for deliberate local testing.
// Server-only.
import { Resend } from "resend";
import { focusLabel, meetingPlatformLabel } from "@/lib/constants";
import { formatRate, formatSlotParts } from "@/lib/format";
import { shortOffsetLabel } from "@/lib/timezone";
import type { BookingMeeting } from "@/lib/ics";

const FROM = process.env.EMAIL_FROM ?? "CaseCoach <bookings@casecoach.app>";

export type EmailResult = "SENT" | "SIMULATED" | "FAILED";

export type BookingEmailInput = {
  bookingId: number;
  start: Date;
  durationMins: number;
  coach: { name: string; email: string; timezone: string };
  student: { name: string; email: string };
  studentTimezone: string; // viewer zone captured at booking time (cc_tz cookie)
  focusArea: string | null;
  pricePaid: number;
  meeting: BookingMeeting;
  ics: string; // the invite, attached to both emails
};

// Coach-provided meeting fields are free text — escape before embedding in HTML.
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

function shell(heading: string, rows: string[], cta: { href: string; label: string }): string {
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;color:#0f172a">
  <h1 style="font-size:20px;margin:0 0 4px">${heading}</h1>
  <table style="width:100%;border-collapse:collapse;margin:16px 0">
    ${rows.map((r) => `<tr><td style="padding:6px 0;font-size:14px;color:#334155">${r}</td></tr>`).join("")}
  </table>
  <a href="${cta.href}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;font-weight:600;font-size:14px;padding:10px 18px;border-radius:8px">${cta.label}</a>
  <p style="font-size:12px;color:#94a3b8;margin-top:20px">A calendar invite (invite.ics) is attached. Booked via CaseCoach — simulated payment (MVP).</p>
</div>`;
}

export async function sendBookingEmails(input: BookingEmailInput): Promise<EmailResult> {
  const focus = input.focusArea ? focusLabel(input.focusArea) : "Case coaching";
  const studentWhen = whenLabel(input.start, input.studentTimezone);
  const coachWhen = whenLabel(input.start, input.coach.timezone);
  const m = input.meeting;
  const meetingRows = [
    `<strong>Platform:</strong> ${escapeHtml(meetingPlatformLabel(m.platform))}`,
    `<strong>Meeting URL:</strong> <a href="${escapeHtml(m.url)}">${escapeHtml(m.url)}</a>`,
    ...(m.id ? [`<strong>Meeting ID:</strong> ${escapeHtml(m.id)}`] : []),
    ...(m.passcode ? [`<strong>Passcode:</strong> ${escapeHtml(m.passcode)}`] : []),
    ...(m.instructions ? [`<strong>Instructions:</strong> ${escapeHtml(m.instructions)}`] : []),
  ];

  const studentSubject = `Your CaseCoach session with ${input.coach.name} — ${formatSlotParts(input.start, input.studentTimezone).dateLabel}`;
  const studentHtml = shell(
    `You're booked with ${input.coach.name}`,
    [
      `<strong>When:</strong> ${studentWhen}`,
      `<strong>Focus:</strong> ${focus}`,
      ...meetingRows,
      `<strong>Coach contact:</strong> ${input.coach.email}`,
      `<strong>Paid:</strong> ${formatRate(input.pricePaid)} · simulated`,
    ],
    { href: m.url, label: "Join the session" },
  );

  const coachSubject = `New booking: ${input.student.name} — ${formatSlotParts(input.start, input.coach.timezone).dateLabel}`;
  const coachHtml = shell(
    `New booking from ${input.student.name}`,
    [
      `<strong>When:</strong> ${coachWhen}`,
      `<strong>Focus:</strong> ${focus}`,
      ...meetingRows,
      `<strong>Student contact:</strong> ${input.student.email}`,
    ],
    { href: m.url, label: "Join the session" },
  );

  const attachments = [
    { filename: "invite.ics", content: Buffer.from(input.ics, "utf8") },
  ];

  if (!liveSendEnabled()) {
    console.log(
      `[email:SIMULATED] booking ${input.bookingId}: -> ${input.student.email} (${studentWhen}) & ${input.coach.email} (${coachWhen}); join ${m.url}`,
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
