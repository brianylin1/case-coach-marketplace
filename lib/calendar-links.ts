// Client-safe builders for "Add to calendar" web links (Google, Outlook). Times
// are encoded in UTC so each provider localizes for the signed-in user. Safe to
// import from client components (no Node APIs).

const pad = (n: number) => String(n).padStart(2, "0");

function utcCompact(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

export type CalendarLinkInput = {
  title: string;
  start: Date;
  durationMins: number;
  description: string;
  location: string;
};

export function googleCalendarUrl(i: CalendarLinkInput): string {
  const end = new Date(i.start.getTime() + i.durationMins * 60_000);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: i.title,
    dates: `${utcCompact(i.start)}/${utcCompact(end)}`,
    details: i.description,
    location: i.location,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function outlookCalendarUrl(i: CalendarLinkInput): string {
  const end = new Date(i.start.getTime() + i.durationMins * 60_000);
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: i.title,
    startdt: i.start.toISOString(),
    enddt: end.toISOString(),
    body: i.description,
    location: i.location,
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}
