import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { setSession } from "@/lib/session";
import { isEmail, str } from "@/lib/validation";

// Passwordless sign-in: look the email up in the chosen role's table.
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const email = str(body.email, 200).toLowerCase();
  const role = body.role;

  if (!isEmail(email)) {
    return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
  }
  if (role !== "student" && role !== "coach") {
    return NextResponse.json({ error: "Choose student or coach." }, { status: 400 });
  }

  if (role === "student") {
    const student = await prisma.student.findUnique({ where: { email } });
    if (!student) {
      return NextResponse.json(
        { error: "No student account found for that email." },
        { status: 404 },
      );
    }
    await setSession({ role: "student", id: student.id });
    return NextResponse.json({ id: student.id, role: "student" });
  }

  const coach = await prisma.coach.findUnique({ where: { email } });
  if (!coach) {
    return NextResponse.json(
      { error: "No coach account found for that email." },
      { status: 404 },
    );
  }
  await setSession({ role: "coach", id: coach.id });
  return NextResponse.json({ id: coach.id, role: "coach" });
}
