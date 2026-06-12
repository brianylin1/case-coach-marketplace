import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/app/generated/prisma/client";
import { toSessionView } from "@/lib/serialize";
import { isFirm, isFocusKey, priceBucket } from "@/lib/constants";
import {
  BOOKING_HORIZON_DAYS,
  SESSION_MINUTES,
  coachSessionStarts,
} from "@/lib/availability";
import { getViewerTimeZone } from "@/lib/viewer-tz";
import { bookableCoachWhere } from "@/lib/bookable";

// Returns the coaches available in one viewer-local hour, honoring the same
// firm/focus/price filters. Powers the calendar cell modal (fetch-on-click).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const start = new Date(searchParams.get("start") ?? "");

  // `start` is the cell's hour, as an absolute UTC instant.
  if (
    Number.isNaN(start.getTime()) ||
    start.getUTCSeconds() !== 0 ||
    start.getUTCMilliseconds() !== 0
  ) {
    return NextResponse.json({ error: "Invalid time." }, { status: 400 });
  }
  const now = new Date();
  const cellEnd = new Date(start.getTime() + SESSION_MINUTES * 60_000);
  // Generous upper bound (+1 day) so a near-horizon click isn't dropped when the
  // viewer's local window runs ahead of UTC; the page only renders valid cells.
  const maxUpper = new Date(now.getTime() + (BOOKING_HORIZON_DAYS + 1) * 86_400_000);
  if (cellEnd <= now || start >= maxUpper) {
    return NextResponse.json({ slots: [] });
  }

  const firm = searchParams.get("firm") ?? "";
  const focus = searchParams.get("focus") ?? "";
  const price = searchParams.get("price") ?? "";

  const where: Prisma.CoachWhereInput = bookableCoachWhere();
  if (firm && isFirm(firm)) where.firm = firm;
  if (focus && isFocusKey(focus)) where.focusAreas = { contains: `"${focus}"` };
  const bucket = priceBucket(price);
  if (bucket.min != null || bucket.max != null) {
    where.hourlyRate = {
      ...(bucket.min != null ? { gte: bucket.min } : {}),
      ...(bucket.max != null ? { lte: bucket.max } : {}),
    };
  }

  const coaches = await prisma.coach.findMany({ where, include: { blocks: true } });
  // Match any coach with a session start inside this viewer-local hour. A coach's
  // own local hour can land on a different minute in the viewer's zone (e.g.
  // half-hour offsets), so we generate within [start, cellEnd) rather than
  // matching one exact instant. Don't surface starts already in the past.
  const genFrom = start < now ? now : start;
  const candidates: { coach: (typeof coaches)[number]; start: Date }[] = [];
  for (const coach of coaches) {
    const [sessionStart] = coachSessionStarts(coach.blocks, genFrom, cellEnd, coach.timezone);
    if (sessionStart) candidates.push({ coach, start: sessionStart });
  }

  const booked = await prisma.booking.findMany({
    where: {
      startTime: { gte: start, lt: cellEnd },
      status: { in: ["CONFIRMED", "PENDING_PAYMENT"] },
      coachId: { in: candidates.map((c) => c.coach.id) },
    },
    select: { coachId: true, startTime: true },
  });
  const bookedSet = new Set(
    booked.map((b) => `${b.coachId}:${new Date(b.startTime).toISOString()}`),
  );

  const viewerTz = await getViewerTimeZone();
  const slots = candidates
    .filter((c) => !bookedSet.has(`${c.coach.id}:${c.start.toISOString()}`))
    .map((c) => toSessionView(c.coach, c.start, viewerTz))
    .sort((a, b) => a.coach.name.localeCompare(b.coach.name));

  return NextResponse.json({ slots });
}
