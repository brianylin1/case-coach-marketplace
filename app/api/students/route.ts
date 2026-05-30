import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setSession } from "@/lib/session";
import { serializeList } from "@/lib/format";
import { isEmail, str, strList } from "@/lib/validation";
import { isFirm, isFocusKey } from "@/lib/constants";

// Create (or update) a student profile and sign them in. Idempotent on email
// so re-submitting just refreshes preferences — keeps signup low-friction.
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const name = str(body.name, 120);
  const email = str(body.email, 200).toLowerCase();
  const targetFirms = strList(body.targetFirms).filter(isFirm);
  const focusAreas = strList(body.focusAreas).filter(isFocusKey);
  const timeline = str(body.timeline, 120) || null;
  const goal = str(body.goal, 2000) || null;

  if (!name) {
    return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
  }
  if (!isEmail(email)) {
    return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
  }

  const data = {
    name,
    targetFirms: serializeList(targetFirms),
    focusAreas: serializeList(focusAreas),
    timeline,
    goal,
  };

  const student = await prisma.student.upsert({
    where: { email },
    update: data,
    create: { email, ...data },
  });

  await setSession({ role: "student", id: student.id });
  return NextResponse.json({ id: student.id, role: "student" });
}
