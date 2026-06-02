import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { cellsToBlocks, GRID_END_HOUR, GRID_START_HOUR } from "@/lib/availability";

// A coach saves their weekly availability grid. The client sends the painted
// {weekday, hour} cells; we validate, merge into blocks, and replace.
export async function PUT(request: Request) {
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

  const raw = Array.isArray(body.cells) ? body.cells : [];
  const cells = raw
    .map((c) => ({
      weekday: Number((c as { weekday: unknown }).weekday),
      hour: Number((c as { hour: unknown }).hour),
    }))
    .filter(
      (c) =>
        Number.isInteger(c.weekday) &&
        c.weekday >= 0 &&
        c.weekday <= 6 &&
        Number.isInteger(c.hour) &&
        c.hour >= GRID_START_HOUR &&
        c.hour < GRID_END_HOUR,
    );

  const blocks = cellsToBlocks(cells);

  await prisma.$transaction([
    prisma.availabilityBlock.deleteMany({ where: { coachId: session.id } }),
    ...(blocks.length > 0
      ? [
          prisma.availabilityBlock.createMany({
            data: blocks.map((b) => ({ coachId: session.id, ...b })),
          }),
        ]
      : []),
  ]);

  return NextResponse.json({ ok: true, hours: cells.length });
}
