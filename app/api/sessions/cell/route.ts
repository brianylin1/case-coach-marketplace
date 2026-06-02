import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/app/generated/prisma/client";
import { toSessionView } from "@/lib/serialize";
import { isFirm, isFocusKey, priceBucket } from "@/lib/constants";
import { BOOKING_HORIZON_DAYS, isStartWithinBlocks } from "@/lib/availability";
import { addDays, startOfUtcDay } from "@/lib/format";

// Returns the coaches available at one exact day/hour, honoring the same
// firm/focus/price filters. Powers the calendar cell modal (fetch-on-click).
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const start = new Date(searchParams.get("start") ?? "");

  if (Number.isNaN(start.getTime()) || start.getUTCMinutes() !== 0) {
    return NextResponse.json({ error: "Invalid time." }, { status: 400 });
  }
  const now = new Date();
  if (start < now || start >= addDays(startOfUtcDay(now), BOOKING_HORIZON_DAYS)) {
    return NextResponse.json({ slots: [] });
  }

  const firm = searchParams.get("firm") ?? "";
  const focus = searchParams.get("focus") ?? "";
  const price = searchParams.get("price") ?? "";

  const where: Prisma.CoachWhereInput = { isActive: true };
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
  const candidates = coaches.filter((c) => isStartWithinBlocks(c.blocks, start));

  const booked = await prisma.booking.findMany({
    where: {
      startTime: start,
      status: "CONFIRMED",
      coachId: { in: candidates.map((c) => c.id) },
    },
    select: { coachId: true },
  });
  const bookedSet = new Set(booked.map((b) => b.coachId));

  const slots = candidates
    .filter((c) => !bookedSet.has(c.id))
    .map((c) => toSessionView(c, start))
    .sort((a, b) => a.coach.name.localeCompare(b.coach.name));

  return NextResponse.json({ slots });
}
