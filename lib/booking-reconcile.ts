import { after } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { payoutReleaseAfter } from "@/lib/payments";
import { notifyBookingConfirmed } from "@/lib/booking-notify";

// Single source of truth for confirming a paid booking: verify the booking's
// Checkout session with Stripe and, if paid, transition the held row to
// CONFIRMED (record the charge for the later payout, set the hold release, send
// the invite). Idempotent — only a PENDING_PAYMENT row is touched and the
// status-guarded updateMany means the webhook, the success-page poll, and the
// stale-hold reclaim can all call this without double-confirming or
// double-emailing. Because it reads payment state straight from Stripe, the
// webhook becomes an optimization rather than a single point of failure.
//
// Returns the booking's resulting status ("CONFIRMED" once paid, otherwise the
// unchanged status, or "MISSING" if the booking is gone). Callers must ensure
// Stripe is configured (it calls getStripe()).
export async function reconcileBooking(bookingId: number): Promise<string> {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) return "MISSING";
  // Already settled (or never a paid hold) — nothing to do.
  if (booking.status !== "PENDING_PAYMENT") return booking.status;
  if (!booking.stripeCheckoutSessionId) return booking.status;

  const session = await getStripe().checkout.sessions.retrieve(
    booking.stripeCheckoutSessionId,
  );
  if (session.payment_status !== "paid") return "PENDING_PAYMENT"; // unpaid / abandoned

  const piId =
    typeof session.payment_intent === "string"
      ? session.payment_intent
      : (session.payment_intent?.id ?? null);
  let chargeId: string | null = null;
  if (piId) {
    const pi = await getStripe().paymentIntents.retrieve(piId);
    chargeId =
      typeof pi.latest_charge === "string"
        ? pi.latest_charge
        : (pi.latest_charge?.id ?? null);
  }

  const result = await prisma.booking.updateMany({
    where: { id: bookingId, status: "PENDING_PAYMENT" },
    data: {
      status: "CONFIRMED",
      paymentStatus: "PAID",
      payoutStatus: "HELD",
      payoutReleaseAfter: payoutReleaseAfter(
        booking.startTime,
        booking.durationMins,
      ),
      stripePaymentIntentId: piId,
      stripeChargeId: chargeId,
    },
  });
  // Only the winning transition (count > 0) sends the invite.
  if (result.count > 0) {
    const studentTz = session.metadata?.studentTz || "UTC";
    after(() => notifyBookingConfirmed(bookingId, studentTz));
  }
  return "CONFIRMED";
}
