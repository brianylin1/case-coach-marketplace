import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/app/generated/prisma/client";
import { getCurrentUser } from "@/lib/session";
import { SessionFilters } from "@/components/SessionFilters";
import { SessionBrowser } from "@/components/SessionBrowser";
import { toSessionView } from "@/lib/serialize";
import { isFirm, isFocusKey, priceBucket } from "@/lib/constants";
import { BOOKING_HORIZON_DAYS, coachSessionStarts } from "@/lib/availability";
import {
  addDays,
  dayKeyOf,
  monthDayLabel,
  relativeDayLabel,
  startOfUtcDay,
  upcomingDays,
} from "@/lib/format";
import type { DaySection, SlotView } from "@/lib/types";

export const metadata: Metadata = {
  title: "Book an MBB case coach — CaseCoach",
  description:
    "Browse open coaching slots from McKinsey, Bain, and BCG consultants and book instantly.",
};

type SearchParams = Promise<{
  date?: string;
  firm?: string;
  focus?: string;
  price?: string;
}>;

export default async function SessionsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { date, firm, focus, price } = await searchParams;
  const now = new Date();
  const todayStart = startOfUtcDay(now);
  const days = upcomingDays(BOOKING_HORIZON_DAYS);

  // Time window: a specific day if chosen, otherwise the next 7 days.
  let lower = now;
  let upper = addDays(todayStart, BOOKING_HORIZON_DAYS);
  const selectedDate = date && days.some((d) => d.dayKey === date) ? date : "";
  if (selectedDate) {
    const dayStart = new Date(`${selectedDate}T00:00:00Z`);
    lower = dayStart > now ? dayStart : now;
    upper = addDays(dayStart, 1);
  }

  const coachWhere: Prisma.CoachWhereInput = { isActive: true };
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

  const [coaches, bookings] = await Promise.all([
    prisma.coach.findMany({ where: coachWhere, include: { blocks: true } }),
    prisma.booking.findMany({
      where: { status: "CONFIRMED", startTime: { gte: lower, lt: upper } },
      select: { coachId: true, startTime: true },
    }),
  ]);

  const taken = new Set(
    bookings.map((b) => `${b.coachId}:${new Date(b.startTime).toISOString()}`),
  );

  // Generate bookable sessions from each coach's weekly blocks, minus booked.
  const views: SlotView[] = [];
  for (const coach of coaches) {
    for (const start of coachSessionStarts(coach.blocks, lower, upper)) {
      if (taken.has(`${coach.id}:${start.toISOString()}`)) continue;
      views.push(toSessionView(coach, start));
    }
  }
  views.sort((a, b) => a.startISO.localeCompare(b.startISO));

  const todayKey = dayKeyOf(todayStart);
  const sectionMap = new Map<string, DaySection>();
  for (const view of views) {
    let section = sectionMap.get(view.dayKey);
    if (!section) {
      section = {
        dayKey: view.dayKey,
        label: relativeDayLabel(view.dayKey, todayKey),
        dateLabel: monthDayLabel(view.dayKey),
        slots: [],
      };
      sectionMap.set(view.dayKey, section);
    }
    section.slots.push(view);
  }
  const sections = [...sectionMap.values()].sort((a, b) =>
    a.dayKey.localeCompare(b.dayKey),
  );

  const user = await getCurrentUser();
  const isStudent = user?.role === "student";
  const coachCount = new Set(views.map((v) => v.coach.id)).size;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Book an MBB case coach
        </h1>
        <p className="mt-1 text-slate-600">
          Pick a time that works and book instantly — coaches from McKinsey, Bain
          &amp; BCG, available this week.
        </p>
      </header>

      <SessionFilters days={days} />

      <p className="mt-5 text-sm text-slate-500">
        {views.length} open session{views.length === 1 ? "" : "s"} across{" "}
        {coachCount} coach{coachCount === 1 ? "" : "es"}
      </p>

      <SessionBrowser sections={sections} isStudent={Boolean(isStudent)} />
    </div>
  );
}
