import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getViewerTimeZone } from "@/lib/viewer-tz";
import { str } from "@/lib/validation";
import { processPayment } from "@/lib/payments";
import { buildBookingEvent, buildIcs } from "@/lib/ics";
import { sendBookingEmails } from "@/lib/email";
import {
  BOOKING_HORIZON_DAYS,
  isStartWithinBlocks,
  SESSION_MINUTES,
} from "@/lib/availability";

// A logged-in student books a generated 60-min session by (coachId, startTime).
// Payment is simulated via lib/payments.ts (swap for Stripe later).
export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "student") {
    return NextResponse.json(
      { error: "Sign in as a student to book a session." },
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
  const startTime = new Date(str(body.startTime, 40));
  const focusArea = str(body.focusArea, 60) || null;

  if (!Number.isInteger(coachId)) {
    return NextResponse.json({ error: "Unknown coach." }, { status: 400 });
  }
  if (Number.isNaN(startTime.getTime())) {
    return NextResponse.json({ error: "Invalid session time." }, { status: 400 });
  }
  // The instant must be clean; on-the-(local)-hour alignment + availability are
  // validated against the coach's blocks (in their zone) once the coach loads.
  if (
    startTime.getUTCSeconds() !== 0 ||
    startTime.getUTCMilliseconds() !== 0
  ) {
    return NextResponse.json({ error: "Invalid session time." }, { status: 400 });
  }
  const now = new Date();
  if (startTime <= now) {
    return NextResponse.json({ error: "That time has already passed." }, { status: 409 });
  }
  // Generous upper bound (+1 day) so the viewer's local window can run ahead of
  // UTC without rejecting a valid near-horizon booking.
  const maxUpper = new Date(now.getTime() + (BOOKING_HORIZON_DAYS + 1) * 86_400_000);
  if (startTime >= maxUpper) {
    return NextResponse.json(
      { error: "That time is outside the booking window." },
      { status: 400 },
    );
  }

  const coach = await prisma.coach.findUnique({
    where: { id: coachId },
    include: { blocks: true },
  });
  if (!coach || !coach.isActive) {
    return NextResponse.json({ error: "That session isn't available." }, { status: 404 });
  }
  if (!isStartWithinBlocks(coach.blocks, startTime, coach.timezone)) {
    return NextResponse.json(
      { error: "That time is no longer available." },
      { status: 409 },
    );
  }

  const student = await prisma.student.findUnique({ where: { id: session.id } });
  if (!student) {
    return NextResponse.json(
      { error: "Your session has expired — please sign in again." },
      { status: 401 },
    );
  }

  // Coaches must provide their own meeting room; a coach without one isn't
  // bookable. Snapshot the details onto the booking so the email, .ics, and
  // dashboards stay consistent even if the coach later edits their room.
  if (!coach.meetingUrl || !coach.meetingPlatform) {
    return NextResponse.json(
      { error: "This coach hasn't finished setting up their meeting room yet." },
      { status: 409 },
    );
  }
  const meeting = {
    platform: coach.meetingPlatform,
    url: coach.meetingUrl,
    id: coach.meetingId,
    passcode: coach.meetingPasscode,
    instructions: coach.meetingInstructions,
  };

  const amount = coach.hourlyRate;
  const payment = await processPayment({
    amount,
    description: `CaseCoach session with ${coach.name}`,
  });

  try {
    const booking = await prisma.$transaction(async (tx) => {
      const existing = await tx.booking.findUnique({
        where: { coachId_startTime: { coachId, startTime } },
      });
      if (existing) throw new Error("TAKEN");
      return tx.booking.create({
        data: {
          coachId,
          studentId: session.id,
          startTime,
          durationMins: SESSION_MINUTES,
          focusArea,
          pricePaid: amount,
          paymentStatus: payment.status,
          paymentRef: payment.reference,
          status: "CONFIRMED",
          meetingPlatform: meeting.platform,
          meetingUrl: meeting.url,
          meetingId: meeting.id,
          meetingPasscode: meeting.passcode,
          meetingInstructions: meeting.instructions,
        },
      });
    });

    // Capture the student's display zone (cc_tz cookie) in request scope.
    const studentTimezone = await getViewerTimeZone();
    // Build the invite + email both parties after the response is sent, so a
    // mail hiccup never fails a paid booking (Vercel keeps the function alive).
    after(async () => {
      try {
        const ics = buildIcs(
          buildBookingEvent({
            bookingId: booking.id,
            start: startTime,
            durationMins: SESSION_MINUTES,
            coachName: coach.name,
            coachEmail: coach.email,
            studentName: student.name,
            studentEmail: student.email,
            focusArea,
            meeting,
          }),
        );
        const result = await sendBookingEmails({
          bookingId: booking.id,
          start: startTime,
          durationMins: SESSION_MINUTES,
          coach: { name: coach.name, email: coach.email, timezone: coach.timezone },
          student: { name: student.name, email: student.email },
          studentTimezone,
          focusArea,
          pricePaid: amount,
          meeting,
          ics,
        });
        await prisma.booking.update({
          where: { id: booking.id },
          data: { emailStatus: result },
        });
      } catch (err) {
        console.error(`booking ${booking.id} notify failed`, err);
        await prisma.booking
          .update({ where: { id: booking.id }, data: { emailStatus: "FAILED" } })
          .catch(() => {});
      }
    });

    return NextResponse.json({
      id: booking.id,
      pricePaid: amount,
      paymentStatus: payment.status,
      meeting,
      coach: {
        name: coach.name,
        email: coach.email,
        firm: coach.firm,
        title: coach.title,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Sorry — that time was just booked. Pick another." },
      { status: 409 },
    );
  }
}
