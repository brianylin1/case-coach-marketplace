// Side-effects fired once a booking is CONFIRMED: build the .ics invite and
// email both parties, then record the email status. Loads everything from the
// persisted booking (incl. the meeting snapshot), so it can be called both from
// the booking route (pro bono / simulated path) and from the Stripe webhook
// (paid path) with just an id. Safe to run inside next/server `after()`.

import { prisma } from "@/lib/prisma";
import { buildBookingEvent, buildIcs } from "@/lib/ics";
import { sendBookingEmails } from "@/lib/email";

export async function notifyBookingConfirmed(
  bookingId: number,
  studentTimezone: string,
): Promise<void> {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: { coach: true, student: true },
    });
    if (!booking) return;
    // A confirmed booking always carries its meeting snapshot; guard anyway so
    // the types narrow and we never send a half-built invite.
    if (!booking.meetingUrl || !booking.meetingPlatform) return;

    const meeting = {
      platform: booking.meetingPlatform,
      url: booking.meetingUrl,
      id: booking.meetingId,
      passcode: booking.meetingPasscode,
      instructions: booking.meetingInstructions,
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

    const result = await sendBookingEmails({
      bookingId: booking.id,
      start: booking.startTime,
      durationMins: booking.durationMins,
      coach: {
        name: booking.coach.name,
        email: booking.coach.email,
        timezone: booking.coach.timezone,
      },
      student: { name: booking.student.name, email: booking.student.email },
      studentTimezone,
      focusArea: booking.focusArea,
      pricePaid: booking.pricePaid,
      meeting,
      ics,
    });

    await prisma.booking.update({
      where: { id: booking.id },
      data: { emailStatus: result },
    });
  } catch (err) {
    console.error(`booking ${bookingId} notify failed`, err);
    await prisma.booking
      .update({ where: { id: bookingId }, data: { emailStatus: "FAILED" } })
      .catch(() => {});
  }
}
