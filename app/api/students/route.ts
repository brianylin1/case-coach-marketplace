import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, setSession } from "@/lib/session";
import { serializeList } from "@/lib/format";
import { isEmail, str, strList } from "@/lib/validation";
import { isFirm, isFocusKey } from "@/lib/constants";

// Create or update a student profile and sign them in.
// - A logged-in student is editing their own preferences: we update by their
//   session id and ignore any submitted email, so changing the email in the
//   payload can never fork a second student record.
// - Otherwise this is a fresh signup: upsert by email (idempotent), which keeps
//   signup low-friction.
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const name = str(body.name, 120);
  const targetFirms = strList(body.targetFirms).filter(isFirm);
  const focusAreas = strList(body.focusAreas).filter(isFocusKey);
  const timeline = str(body.timeline, 120) || null;
  const goal = str(body.goal, 2000) || null;

  if (!name) {
    return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
  }

  const data = {
    name,
    targetFirms: serializeList(targetFirms),
    focusAreas: serializeList(focusAreas),
    timeline,
    goal,
  };

  // Editing an existing student: identity is fixed to the session. getCurrentUser()
  // returns null for a stale/logged-out cookie, so that falls through to signup.
  const user = await getCurrentUser();
  if (user?.role === "student") {
    const student = await prisma.student.update({
      where: { id: user.student.id },
      data,
    });
    await setSession({ role: "student", id: student.id });
    return NextResponse.json({ id: student.id, role: "student" });
  }

  // Fresh signup: email is the identity key.
  const email = str(body.email, 200).toLowerCase();
  if (!isEmail(email)) {
    return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
  }

  const student = await prisma.student.upsert({
    where: { email },
    update: data,
    create: { email, ...data },
  });

  await setSession({ role: "student", id: student.id });
  return NextResponse.json({ id: student.id, role: "student" });
}
