import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/app/generated/prisma/client";
import { getCurrentUser } from "@/lib/session";
import { SessionFilters } from "@/components/SessionFilters";
import { ViewToggle } from "@/components/ViewToggle";
import { SessionCalendar } from "@/components/SessionCalendar";
import { SessionBrowser } from "@/components/SessionBrowser";
import { toSessionView } from "@/lib/serialize";
import { PAYMENTS_ENABLED } from "@/lib/payments";
import { bookableCoachWhere } from "@/lib/bookable";
import { FIRMS, isFirm, isFocusKey, priceBucket } from "@/lib/constants";
import {
  BOOKING_HORIZON_DAYS,
  bookingWindow,
  calendarHours,
  coachSessionStarts,
} from "@/lib/availability";
import { monthDayLabel, relativeDayLabel, upcomingDays } from "@/lib/format";
import { getViewerTimeZone } from "@/lib/viewer-tz";
import { zonedDayKey, zonedParts } from "@/lib/timezone";
import type { CalendarCell, DaySection, SlotView } from "@/lib/types";

export const metadata: Metadata = {
  title: "Book a mock case · Down to Case",
  description:
    "Book a live mock case with current and former consultants from top firms. Pick a time and book instantly.",
};

type SearchParams = Promise<{
  view?: string;
  firm?: string;
  focus?: string;
  price?: string;
}>;

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { view: viewParam, firm, focus, price } = await searchParams;
  const view = viewParam === "list" ? "list" : "calendar";

  const viewerTz = await getViewerTimeZone();
  const now = new Date();
  const { lower, upper } = bookingWindow(now, viewerTz);

  // Active coaches with a meeting room — and, when payments are on, able to be
  // paid (paid coaches need payouts enabled; pro bono never need Stripe).
  const coachWhere: Prisma.CoachWhereInput = bookableCoachWhere();
  if (firm && isFirm(firm)) coachWhere.firm = firm;
  if (focus && isFocusKey(focus)) {
    coachWhere.focusAreas = { contains: `"${focus}"` };
  }
  const bucket = priceBucket(price);
  if (bucket.min != null || bucket.max != null) {
    coachWhere.hourlyRate = {
      ...(bucket.min != null ? { gte: bucket.min } : {}),
      ...(bucket.max != null ? { lte: bucket.max } : {}),
    };
  }

  // Filters to forward to the cell-detail fetch.
  const fq = new URLSearchParams();
  if (firm && isFirm(firm)) fq.set("firm", firm);
  if (focus && isFocusKey(focus)) fq.set("focus", focus);
  if (price && price !== "any") fq.set("price", price);
  const filterQuery = fq.toString();
  const hasFilters = filterQuery.length > 0;
  const listParams = new URLSearchParams(filterQuery);
  listParams.set("view", "list");
  const listHref = `/sessions?${listParams.toString()}`;

  const [user, bookings] = await Promise.all([
    getCurrentUser(),
    prisma.booking.findMany({
      where: {
        status: { in: ["CONFIRMED", "PENDING_PAYMENT"] },
        startTime: { gte: lower, lt: upper },
      },
      select: { coachId: true, startTime: true },
    }),
  ]);
  const isStudent = user?.role === "student";
  const taken = new Set(
    bookings.map((b) => `${b.coachId}:${new Date(b.startTime).toISOString()}`),
  );

  let content: React.ReactNode;
  let summary: string;

  if (view === "list") {
    const coaches = await prisma.coach.findMany({
      where: coachWhere,
      include: { blocks: true },
    });
    const views: SlotView[] = [];
    for (const coach of coaches) {
      for (const start of coachSessionStarts(coach.blocks, lower, upper, coach.timezone)) {
        if (taken.has(`${coach.id}:${start.toISOString()}`)) continue;
        views.push(toSessionView(coach, start, viewerTz));
      }
    }
    views.sort((a, b) => a.startISO.localeCompare(b.startISO));

    const todayKey = zonedDayKey(now, viewerTz);
    const sectionMap = new Map<string, DaySection>();
    for (const v of views) {
      let section = sectionMap.get(v.dayKey);
      if (!section) {
        section = {
          dayKey: v.dayKey,
          label: relativeDayLabel(v.dayKey, todayKey),
          dateLabel: monthDayLabel(v.dayKey),
          slots: [],
        };
        sectionMap.set(v.dayKey, section);
      }
      section.slots.push(v);
    }
    const sections = [...sectionMap.values()].sort((a, b) =>
      a.dayKey.localeCompare(b.dayKey),
    );
    const coachCount = new Set(views.map((v) => v.coach.id)).size;
    summary = `${views.length} open session${views.length === 1 ? "" : "s"} across ${coachCount} coach${coachCount === 1 ? "" : "es"}`;
    content = (
      <SessionBrowser
        sections={sections}
        isStudent={Boolean(isStudent)}
        paymentsEnabled={PAYMENTS_ENABLED}
      />
    );
  } else {
    // Lightweight calendar: counts + firm dots only (details fetched on click).
    const coaches = await prisma.coach.findMany({
      where: coachWhere,
      select: { id: true, firm: true, blocks: true, timezone: true },
    });
    const cellMap = new Map<
      string,
      { dayKey: string; hour: number; count: number; firms: Set<string> }
    >();
    const activeCoaches = new Set<number>();
    for (const coach of coaches) {
      for (const start of coachSessionStarts(coach.blocks, lower, upper, coach.timezone)) {
        if (taken.has(`${coach.id}:${start.toISOString()}`)) continue;
        // Bucket by the viewer's local day + hour, not UTC.
        const dayKey = zonedDayKey(start, viewerTz);
        const hour = zonedParts(start, viewerTz).hour;
        const key = `${dayKey}#${hour}`;
        const cell = cellMap.get(key) ?? { dayKey, hour, count: 0, firms: new Set<string>() };
        cell.count += 1;
        cell.firms.add(coach.firm);
        cellMap.set(key, cell);
        activeCoaches.add(coach.id);
      }
    }
    const cells: CalendarCell[] = [...cellMap.values()].map((c) => ({
      dayKey: c.dayKey,
      hour: c.hour,
      count: c.count,
      firms: [...c.firms].sort((a, b) => FIRMS.indexOf(a as never) - FIRMS.indexOf(b as never)),
    }));
    const totalSessions = cells.reduce((sum, c) => sum + c.count, 0);
    summary = `${totalSessions} open session${totalSessions === 1 ? "" : "s"} across ${activeCoaches.size} coach${activeCoaches.size === 1 ? "" : "es"} this week`;
    content = (
      <SessionCalendar
        days={upcomingDays(BOOKING_HORIZON_DAYS, viewerTz)}
        hours={calendarHours(cells.map((c) => c.hour))}
        cells={cells}
        isStudent={Boolean(isStudent)}
        paymentsEnabled={PAYMENTS_ENABLED}
        filterQuery={filterQuery}
        nowMs={now.getTime()}
        hasFilters={hasFilters}
        listHref={listHref}
        viewerTz={viewerTz}
      />
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Book a mock case
        </h1>
        <p className="mt-1 text-slate-600">
          Scan a time, then pick your coach. Current and former consultants from
          top firms.
        </p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <SessionFilters />
        <ViewToggle view={view} />
      </div>

      <p className="mt-5 text-sm text-slate-500">
        {summary}{" "}
        <span className="text-slate-400">· times shown in your local time</span>
      </p>

      {content}
    </div>
  );
}
