import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { str } from "@/lib/validation";
import { isFocusKey } from "@/lib/constants";

// A logged-in student requests a session with a coach.
export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "student") {
    return NextResponse.json(
      { error: "Sign in as a student to request a session." },
      { status: 401 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const coachId = Number(body.coachId);
  const focusArea = str(body.focusArea, 60);
  const message = str(body.message, 2000);
  const proposedTimes = str(body.proposedTimes, 240) || null;

  if (!Number.isInteger(coachId)) {
    return NextResponse.json({ error: "Unknown coach." }, { status: 400 });
  }
  if (!isFocusKey(focusArea)) {
    return NextResponse.json({ error: "Pick what you want to work on." }, { status: 400 });
  }
  if (!message) {
    return NextResponse.json({ error: "Add a short message for the coach." }, { status: 400 });
  }

  const coach = await prisma.coach.findUnique({ where: { id: coachId } });
  if (!coach || !coach.isActive) {
    return NextResponse.json({ error: "This coach isn't available." }, { status: 404 });
  }

  const created = await prisma.sessionRequest.create({
    data: {
      studentId: session.id,
      coachId,
      focusArea,
      message,
      proposedTimes,
    },
  });

  return NextResponse.json({ id: created.id });
}
