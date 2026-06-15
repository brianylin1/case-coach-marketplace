import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setSession } from "@/lib/session";
import { isEmail, str } from "@/lib/validation";
import { verifyPassword } from "@/lib/password";

// Email + password sign-in. Every account sets a password at signup, so a
// missing account and a wrong password collapse to the same "invalid
// credentials" response (and we don't reveal which emails exist).
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = str(body.email, 200).toLowerCase();
  const role = body.role;
  // Passwords are never trimmed — whitespace can be part of the secret.
  const password = typeof body.password === "string" ? body.password : "";

  if (!isEmail(email)) {
    return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
  }
  if (role !== "student" && role !== "coach") {
    return NextResponse.json({ error: "Choose student or coach." }, { status: 400 });
  }

  const account =
    role === "student"
      ? await prisma.student.findUnique({ where: { email } })
      : await prisma.coach.findUnique({ where: { email } });

  if (!account || !(await verifyPassword(password, account.passwordHash))) {
    return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
  }

  await setSession({ role, id: account.id });
  return NextResponse.json({ id: account.id, role });
}
