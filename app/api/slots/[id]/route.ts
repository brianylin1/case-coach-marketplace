import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

// A coach removes one of their own open slots (can't remove a booked one).
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || session.role !== "coach") {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }

  const id = Number((await params).id);
  if (!Number.isInteger(id)) {
    return NextResponse.json({ error: "Unknown slot." }, { status: 400 });
  }

  const slot = await prisma.slot.findUnique({ where: { id } });
  if (!slot || slot.coachId !== session.id) {
    return NextResponse.json({ error: "Slot not found." }, { status: 404 });
  }
  if (slot.isBooked) {
    return NextResponse.json(
      { error: "That slot is booked and can't be removed." },
      { status: 400 },
    );
  }

  await prisma.slot.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
