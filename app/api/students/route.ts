import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, setSession } from "@/lib/session";
import { serializeList } from "@/lib/format";
import { isEmail, str, strList } from "@/lib/validation";
import { hashPassword, passwordError } from "@/lib/password";
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

  // Fresh signup: email is the identity key, and a password is now required.
  const email = str(body.email, 200).toLowerCase();
  const password = typeof body.password === "string" ? body.password : "";
  if (!isEmail(email)) {
    return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
  }
  const pwError = passwordError(password);
  if (pwError) {
    return NextResponse.json({ error: pwError }, { status: 400 });
  }

  // Don't silently overwrite an existing account (that used to be possible via
  // upsert-by-email). Send them to sign in, where an unclaimed account is
  // prompted to set a password.
  const existing = await prisma.student.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with this email already exists. Please sign in." },
      { status: 409 },
    );
  }

  const passwordHash = await hashPassword(password);
  const student = await prisma.student.create({ data: { email, passwordHash, ...data } });

  await setSession({ role: "student", id: student.id });
  return NextResponse.json({ id: student.id, role: "student" });
}
