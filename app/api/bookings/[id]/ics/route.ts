import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { buildBookingEvent, buildIcs } from "@/lib/ics";

// Downloadable calendar invite for a booking. Authorized to that booking's
// student or coach only. Powers the "Download .ics" buttons.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const id = Number((await params).id);
  if (!Number.isInteger(id)) return new Response("Not found", { status: 404 });

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { coach: true, student: true },
  });
  if (!booking) return new Response("Not found", { status: 404 });

  const authorized =
    (session.role === "student" && session.id === booking.studentId) ||
    (session.role === "coach" && session.id === booking.coachId);
  if (!authorized) return new Response("Forbidden", { status: 403 });

  // Prefer the booking's snapshot; fall back to the coach's current room for
  // any booking made before details were snapshotted.
  const meeting = {
    platform: booking.meetingPlatform ?? booking.coach.meetingPlatform,
    url: booking.meetingUrl ?? booking.coach.meetingUrl ?? "",
    id: booking.meetingId ?? booking.coach.meetingId,
    passcode: booking.meetingPasscode ?? booking.coach.meetingPasscode,
    instructions: booking.meetingInstructions ?? booking.coach.meetingInstructions,
  };
  const ics = buildIcs(
    buildBookingEvent({
      bookingId: booking.id,
      start: booking.startTime,
      durationMins: booking.durationMins,
      coachName: booking.coach.name,
      coachEmail: booking.coach.email,
      studentName: booking.student.name,
      studentEmail: booking.student.email,
      focusArea: booking.focusArea,
      meeting,
    }),
  );

  return new Response(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8; method=REQUEST",
      "Content-Disposition": `attachment; filename="casecoach-session-${booking.id}.ics"`,
      "Cache-Control": "private, no-store",
    },
  });
}
