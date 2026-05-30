import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { MAX_OPEN_SLOTS } from "@/lib/constants";

// A coach adds an availability slot. Capped at MAX_OPEN_SLOTS open future slots.
export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "coach") {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const start = new Date(String(body.startTime));
  if (Number.isNaN(start.getTime())) {
    return NextResponse.json({ error: "Pick a valid date and time." }, { status: 400 });
  }
  if (start <= new Date()) {
    return NextResponse.json({ error: "Pick a time in the future." }, { status: 400 });
  }

  const openCount = await prisma.slot.count({
    where: { coachId: session.id, isBooked: false, startTime: { gte: new Date() } },
  });
  if (openCount >= MAX_OPEN_SLOTS) {
    return NextResponse.json(
      { error: `You can have up to ${MAX_OPEN_SLOTS} open slots. Remove one first.` },
      { status: 400 },
    );
  }

  const duplicate = await prisma.slot.findFirst({
    where: { coachId: session.id, startTime: start },
  });
  if (duplicate) {
    return NextResponse.json(
      { error: "You already have a slot at that time." },
      { status: 400 },
    );
  }

  const slot = await prisma.slot.create({
    data: { coachId: session.id, startTime: start },
  });
  return NextResponse.json({ id: slot.id });
}
