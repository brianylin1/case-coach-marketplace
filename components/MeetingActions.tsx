import { Video } from "lucide-react";
import { googleCalendarUrl, outlookCalendarUrl } from "@/lib/calendar-links";
import { meetingPlatformLabel } from "@/lib/constants";

// Meeting details + actions for a booked session, shared by the booking
// confirmation modal and the dashboard cards. No hooks / no "use client", so it
// renders in both server and client trees. "Join Session" only shows when a URL
// is present (it always is for new bookings, since a coach room is required).
export type BookingMeetingView = {
  platform: string | null;
  url: string | null;
  id: string | null;
  passcode: string | null;
  instructions: string | null;
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-2">
      <dt className="w-28 shrink-0 text-slate-400">{label}</dt>
      <dd className="min-w-0 break-words text-slate-700">{children}</dd>
    </div>
  );
}

export function MeetingActions({
  bookingId,
  title,
  start,
  durationMins,
  meeting,
}: {
  bookingId: number;
  title: string;
  start: Date;
  durationMins: number;
  meeting: BookingMeetingView;
}) {
  const description = [
    meeting.platform ? `Platform: ${meetingPlatformLabel(meeting.platform)}` : null,
    meeting.url ? `Join: ${meeting.url}` : null,
    meeting.id ? `Meeting ID: ${meeting.id}` : null,
    meeting.passcode ? `Passcode: ${meeting.passcode}` : null,
    meeting.instructions || null,
  ]
    .filter(Boolean)
    .join("\n");
  const calInput = {
    title,
    start,
    durationMins,
    description: description || "Your CaseCoach 1:1 session.",
    location: meeting.url ?? "",
  };

  return (
    <div className="space-y-3 text-sm">
      <dl className="space-y-1">
        {meeting.platform && (
          <Row label="Meeting platform">{meetingPlatformLabel(meeting.platform)}</Row>
        )}
        {meeting.url && (
          <Row label="Meeting URL">
            <a
              href={meeting.url}
              target="_blank"
              rel="noreferrer"
              className="text-indigo-600 hover:underline"
            >
              {meeting.url}
            </a>
          </Row>
        )}
        {meeting.id && <Row label="Meeting ID">{meeting.id}</Row>}
        {meeting.passcode && <Row label="Passcode">{meeting.passcode}</Row>}
        {meeting.instructions && <Row label="Instructions">{meeting.instructions}</Row>}
      </dl>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        {meeting.url && (
          <a
            href={meeting.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-indigo-500"
          >
            <Video className="size-3.5" />
            Join Session
          </a>
        )}
        <span className="inline-flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-medium text-slate-500">
          <span className="text-slate-400">Add to calendar:</span>
          <a
            className="text-indigo-600 hover:underline"
            target="_blank"
            rel="noreferrer"
            href={googleCalendarUrl(calInput)}
          >
            Google
          </a>
          <a
            className="text-indigo-600 hover:underline"
            target="_blank"
            rel="noreferrer"
            href={outlookCalendarUrl(calInput)}
          >
            Outlook
          </a>
          <a className="text-indigo-600 hover:underline" href={`/api/bookings/${bookingId}/ics`}>
            .ics
          </a>
        </span>
      </div>
    </div>
  );
}
