import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getViewerTimeZone } from "@/lib/viewer-tz";
import { str } from "@/lib/validation";
import {
  processPayment,
  PAYMENTS_ENABLED,
  computeSplit,
  CURRENCY,
} from "@/lib/payments";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import { notifyBookingConfirmed } from "@/lib/booking-notify";
import { reconcileBooking } from "@/lib/booking-reconcile";
import {
  BOOKING_HORIZON_DAYS,
  isStartWithinBlocks,
  SESSION_MINUTES,
} from "@/lib/availability";

// A PENDING_PAYMENT hold older than this (just beyond the 30-min Checkout
// expiry) is treated as abandoned and reclaimed, in case the expiry webhook
// was missed.
const STALE_HOLD_MS = 35 * 60 * 1000;

// A logged-in student books a generated 60-min session by (coachId, startTime).
// Paid coaches go through Stripe Checkout when PAYMENTS_ENABLED; pro bono and
// the flag-off path confirm instantly (unchanged behavior).
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
  const usePaidCheckout = PAYMENTS_ENABLED && stripeConfigured() && amount > 0;

  // ---- Paid path: hold the slot, then collect payment via Stripe Checkout.
  // The PENDING_PAYMENT row locks the slot; the charge settles to the platform
  // and the coach's share transfers only after the session (release cron).
  if (usePaidCheckout) {
    if (!coach.stripeAccountId || !coach.stripePayoutsEnabled) {
      return NextResponse.json(
        { error: "This coach isn't set up to take payments yet." },
        { status: 409 },
      );
    }
    const split = computeSplit(amount);

    // Before reclaiming a stale hold, verify it isn't actually paid. A paid-but-
    // unconfirmed hold (delayed/lost webhook) must never be deleted: reconcile
    // flips it to CONFIRMED if Stripe says it's paid, so the transaction below
    // then treats it as genuinely taken rather than reclaimable.
    const existingHold = await prisma.booking.findUnique({
      where: { coachId_startTime: { coachId, startTime } },
    });
    if (
      existingHold?.status === "PENDING_PAYMENT" &&
      now.getTime() - existingHold.createdAt.getTime() > STALE_HOLD_MS
    ) {
      await reconcileBooking(existingHold.id);
    }

    try {
      const booking = await prisma.$transaction(async (tx) => {
        const existing = await tx.booking.findUnique({
          where: { coachId_startTime: { coachId, startTime } },
        });
        if (existing) {
          // Reclaim only a genuinely-unpaid stale hold (reconcile above will have
          // promoted a paid one to CONFIRMED, which falls through to TAKEN here).
          const stale =
            existing.status === "PENDING_PAYMENT" &&
            now.getTime() - existing.createdAt.getTime() > STALE_HOLD_MS;
          if (stale) await tx.booking.delete({ where: { id: existing.id } });
          else throw new Error("TAKEN");
        }
        return tx.booking.create({
          data: {
            coachId,
            studentId: session.id,
            startTime,
            durationMins: SESSION_MINUTES,
            focusArea,
            pricePaid: amount,
            paymentStatus: "REQUIRES_PAYMENT",
            status: "PENDING_PAYMENT",
            meetingPlatform: meeting.platform,
            meetingUrl: meeting.url,
            meetingId: meeting.id,
            meetingPasscode: meeting.passcode,
            meetingInstructions: meeting.instructions,
            coachStripeAccountId: coach.stripeAccountId,
            amountChargedCents: split.amountCents,
            platformFeeCents: split.platformFeeCents,
            coachShareCents: split.coachShareCents,
            currency: CURRENCY,
          },
        });
      });

      try {
        const origin =
          request.headers.get("origin") ?? new URL(request.url).origin;
        const transferGroup = `booking_${booking.id}`;
        // Carry the student's display zone so the webhook can localize emails
        // (no cc_tz cookie is present on the server-to-server webhook call).
        const studentTimezone = await getViewerTimeZone();
        const checkout = await getStripe().checkout.sessions.create({
          mode: "payment",
          customer_email: student.email,
          line_items: [
            {
              quantity: 1,
              price_data: {
                currency: CURRENCY,
                unit_amount: split.amountCents,
                product_data: {
                  name: `Mock case with ${coach.name}`,
                  description: `60-minute live session · ${coach.firm} ${coach.title}`,
                },
              },
            },
          ],
          payment_intent_data: {
            transfer_group: transferGroup,
            metadata: { bookingId: String(booking.id) },
          },
          metadata: {
            bookingId: String(booking.id),
            studentTz: studentTimezone,
          },
          expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
          success_url: `${origin}/booking/success?b=${booking.id}`,
          cancel_url: `${origin}/booking/cancel?b=${booking.id}`,
        });
        await prisma.booking.update({
          where: { id: booking.id },
          data: { stripeCheckoutSessionId: checkout.id },
        });
        return NextResponse.json({ id: booking.id, checkoutUrl: checkout.url });
      } catch (err) {
        console.error(`booking ${booking.id} checkout creation failed`, err);
        // Release the hold so the slot frees immediately.
        await prisma.booking.delete({ where: { id: booking.id } }).catch(() => {});
        return NextResponse.json(
          { error: "Could not start payment. Please try again." },
          { status: 502 },
        );
      }
    } catch {
      return NextResponse.json(
        { error: "Sorry — that time was just booked. Pick another." },
        { status: 409 },
      );
    }
  }

  // ---- Instant path: pro bono, or simulated when PAYMENTS_ENABLED is off.
  const payment = await processPayment({
    amount,
    description: `Down to Case session with ${coach.name}`,
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

    // Capture the student's display zone (cc_tz cookie) in request scope, then
    // build the invite + email both parties after the response is sent, so a
    // mail hiccup never fails a confirmed booking (Vercel keeps the fn alive).
    const studentTimezone = await getViewerTimeZone();
    after(() => notifyBookingConfirmed(booking.id, studentTimezone));

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
