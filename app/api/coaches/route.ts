import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, setSession } from "@/lib/session";
import { serializeList } from "@/lib/format";
import { isValidTimeZone } from "@/lib/timezone";
import { isEmail, nonNegativeInt, str, strList } from "@/lib/validation";
import {
  isBestForKey,
  isFirm,
  isFirmStatus,
  isFocusKey,
  isMeetingPlatform,
  isSessionStyleKey,
} from "@/lib/constants";

// Create (or update) a coach profile and sign them in. Idempotent on email.
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const name = str(body.name, 120);
  const email = str(body.email, 200).toLowerCase();
  const firm = str(body.firm, 40);
  const title = str(body.title, 120);
  const yearsAtFirm = nonNegativeInt(body.yearsAtFirm, 60);
  const headline = str(body.headline, 160) || null;
  const bio = str(body.bio, 2000);
  const focusAreas = strList(body.focusAreas).filter(isFocusKey);
  const hourlyRate = nonNegativeInt(body.hourlyRate, 100_000);
  const availability = str(body.availability, 240) || null;
  const linkedinUrl = str(body.linkedinUrl, 300) || null;
  // Trust/positioning — all optional; unknown keys are dropped, not rejected.
  const bestForRaw = str(body.bestFor, 40);
  const bestFor = isBestForKey(bestForRaw) ? bestForRaw : null;
  const sessionStyles = strList(body.sessionStyles).filter(isSessionStyleKey);
  const firmStatusRaw = str(body.firmStatus, 10);
  const firmStatus = isFirmStatus(firmStatusRaw) ? firmStatusRaw : null;
  const timezoneRaw = str(body.timezone, 64);
  const timezone = isValidTimeZone(timezoneRaw) ? timezoneRaw : "UTC";
  // Coach-provided meeting room. A coach is bookable only once both a valid
  // platform and an http(s) URL are set (no auto-generated rooms).
  const meetingPlatformRaw = str(body.meetingPlatform, 20);
  const meetingPlatform = isMeetingPlatform(meetingPlatformRaw) ? meetingPlatformRaw : null;
  const meetingUrlRaw = str(body.meetingUrl, 500);
  const meetingUrl = /^https?:\/\/\S+$/i.test(meetingUrlRaw) ? meetingUrlRaw : null;
  const meetingId = str(body.meetingId, 80) || null;
  const meetingPasscode = str(body.meetingPasscode, 80) || null;
  const meetingInstructions = str(body.meetingInstructions, 500) || null;

  if (!name) {
    return NextResponse.json({ error: "Please enter your name." }, { status: 400 });
  }
  if (!isEmail(email)) {
    return NextResponse.json({ error: "Please enter a valid email." }, { status: 400 });
  }
  if (!isFirm(firm)) {
    return NextResponse.json({ error: "Please choose your firm." }, { status: 400 });
  }
  if (!title) {
    return NextResponse.json({ error: "Please enter your title." }, { status: 400 });
  }
  if (!bio) {
    return NextResponse.json({ error: "Please add a short bio so students know you." }, { status: 400 });
  }
  if (focusAreas.length === 0) {
    return NextResponse.json({ error: "Pick at least one area you coach." }, { status: 400 });
  }

  const data = {
    name,
    firm,
    title,
    yearsAtFirm,
    headline,
    bio,
    focusAreas: serializeList(focusAreas),
    hourlyRate,
    availability,
    linkedinUrl,
    bestFor,
    sessionStyles: serializeList(sessionStyles),
    firmStatus,
    timezone,
    meetingPlatform,
    meetingUrl,
    meetingId,
    meetingPasscode,
    meetingInstructions,
    isActive: true,
  };

  // A logged-in coach is editing their own profile → update by session id so we
  // never create a duplicate (and keep their existing email). Otherwise it's a
  // signup: upsert by the unique email.
  const session = await getSession();
  const editingId =
    session?.role === "coach" &&
    (await prisma.coach.findUnique({ where: { id: session.id }, select: { id: true } }))
      ? session.id
      : null;

  const coach = editingId
    ? await prisma.coach.update({ where: { id: editingId }, data })
    : await prisma.coach.upsert({ where: { email }, update: data, create: { email, ...data } });

  await setSession({ role: "coach", id: coach.id });
  return NextResponse.json({ id: coach.id, role: "coach" });
}
