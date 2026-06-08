import { Video } from "lucide-react";
import { googleCalendarUrl, outlookCalendarUrl } from "@/lib/calendar-links";
import { meetingPlatformLabel } from "@/lib/constants";

// Meeting details + actions for a booked session, shared by the booking
// confirmation modal and the dashboard cards. No hooks / no "use client", so it
// renders in both server and client trees.
//
// variant "student": one prominent Join button + Add to calendar, with the
//   platform/ID/passcode/instructions tucked behind a native "Show meeting
//   details" disclosure (students don't need the metadata up front — it's all
//   in their calendar invite).
// variant "coach": full details inline (the coach owns the room).
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

function DetailRows({ meeting }: { meeting: BookingMeetingView }) {
  return (
    <dl className="space-y-1 text-sm">
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
  );
}

function CalendarLinks({
  bookingId,
  href,
}: {
  bookingId: number;
  href: { google: string; outlook: string };
}) {
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-medium text-slate-500">
      <span className="text-slate-400">Add to calendar:</span>
      <a className="text-indigo-600 hover:underline" target="_blank" rel="noreferrer" href={href.google}>
        Google
      </a>
      <a className="text-indigo-600 hover:underline" target="_blank" rel="noreferrer" href={href.outlook}>
        Outlook
      </a>
      <a className="text-indigo-600 hover:underline" href={`/api/bookings/${bookingId}/ics`}>
        .ics
      </a>
    </span>
  );
}

export function MeetingActions({
  bookingId,
  title,
  start,
  durationMins,
  meeting,
  variant = "coach",
}: {
  bookingId: number;
  title: string;
  start: Date;
  durationMins: number;
  meeting: BookingMeetingView;
  variant?: "student" | "coach";
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
  const calHref = { google: googleCalendarUrl(calInput), outlook: outlookCalendarUrl(calInput) };
  const hasDetails = Boolean(
    meeting.platform || meeting.url || meeting.id || meeting.passcode || meeting.instructions,
  );

  if (variant === "student") {
    return (
      <div className="space-y-3 text-sm">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          {meeting.url && (
            <a
              href={meeting.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-500"
            >
              <Video className="size-4" />
              Join Session
            </a>
          )}
          <CalendarLinks bookingId={bookingId} href={calHref} />
        </div>
        {hasDetails && (
          <details className="text-xs">
            <summary className="cursor-pointer font-medium text-indigo-600 hover:underline">
              Show meeting details
            </summary>
            <div className="mt-2">
              <DetailRows meeting={meeting} />
            </div>
          </details>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 text-sm">
      <DetailRows meeting={meeting} />
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
        <CalendarLinks bookingId={bookingId} href={calHref} />
      </div>
    </div>
  );
}
