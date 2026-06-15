import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setSession } from "@/lib/session";
import { isEmail, str } from "@/lib/validation";
import { hashPassword, passwordError } from "@/lib/password";

// One-time password claim for a legacy/unclaimed account (passwordHash == null).
// This is how existing users transition: they enter their email and choose a
// password on next sign-in. It deliberately only works on an account that has
// NO password yet — so it can't be used to reset an already-secured account
// (that would need email-based recovery, which is out of scope by design).
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = str(body.email, 200).toLowerCase();
  const role = body.role;
  const password = typeof body.password === "string" ? body.password : "";

  if (!isEmail(email)) {
    return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
  }
  if (role !== "student" && role !== "coach") {
    return NextResponse.json({ error: "Choose student or coach." }, { status: 400 });
  }
  const pwError = passwordError(password);
  if (pwError) {
    return NextResponse.json({ error: pwError }, { status: 400 });
  }

  const account =
    role === "student"
      ? await prisma.student.findUnique({ where: { email } })
      : await prisma.coach.findUnique({ where: { email } });

  if (!account) {
    return NextResponse.json(
      { error: `No ${role} account found for that email.` },
      { status: 404 },
    );
  }
  if (account.passwordHash) {
    return NextResponse.json(
      { error: "This account already has a password. Please sign in." },
      { status: 409 },
    );
  }

  const passwordHash = await hashPassword(password);
  if (role === "student") {
    await prisma.student.update({ where: { id: account.id }, data: { passwordHash } });
  } else {
    await prisma.coach.update({ where: { id: account.id }, data: { passwordHash } });
  }

  await setSession({ role, id: account.id });
  return NextResponse.json({ id: account.id, role });
}
