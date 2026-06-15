// Lightweight sessions: a signed cookie holding role + id. This is just the
// session primitive — credential checks (email + password) live in lib/password.ts
// and the /api/auth routes. Server-only — never import from a "use client"
// component.
import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "cc_session";
const SECRET = process.env.SESSION_SECRET ?? "dev-insecure-secret-change-me";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export type Role = "student" | "coach";
export type SessionData = { role: Role; id: number };

function sign(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("hex");
}

function serialize(data: SessionData): string {
  const payload = `${data.role}:${data.id}`;
  return `${payload}.${sign(payload)}`;
}

function parse(token: string | undefined): SessionData | null {
  if (!token) return null;
  const dot = token.lastIndexOf(".");
  if (dot === -1) return null;
  const payload = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  const expected = sign(payload);
  if (
    signature.length !== expected.length ||
    !timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  ) {
    return null;
  }
  const [role, idRaw] = payload.split(":");
  const id = Number(idRaw);
  if ((role !== "student" && role !== "coach") || !Number.isInteger(id)) return null;
  return { role, id };
}

export async function setSession(data: SessionData): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, serialize(data), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE,
  });
}

export async function clearSession(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function getSession(): Promise<SessionData | null> {
  const store = await cookies();
  return parse(store.get(COOKIE_NAME)?.value);
}

export type CurrentUser =
  | { role: "student"; student: NonNullable<Awaited<ReturnType<typeof findStudent>>> }
  | { role: "coach"; coach: NonNullable<Awaited<ReturnType<typeof findCoach>>> };

function findStudent(id: number) {
  return prisma.student.findUnique({ where: { id } });
}

function findCoach(id: number) {
  return prisma.coach.findUnique({ where: { id } });
}

// Resolves the cookie to a real DB row. Returns null if logged out or stale.
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getSession();
  if (!session) return null;

  if (session.role === "student") {
    const student = await findStudent(session.id);
    return student ? { role: "student", student } : null;
  }
  const coach = await findCoach(session.id);
  return coach ? { role: "coach", coach } : null;
}
