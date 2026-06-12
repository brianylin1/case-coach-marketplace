import { NextResponse, after } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import { PAYMENTS_ENABLED, payoutReleaseAfter } from "@/lib/payments";
import { notifyBookingConfirmed } from "@/lib/booking-notify";

// Stripe webhook. Verifies the signature over the raw body, then handles events
// idempotently. Acknowledges unhandled events with 200 so Stripe stops retrying.
// (Checkout session events are added alongside the paid booking path.)
export async function POST(request: Request) {
  if (!PAYMENTS_ENABLED || !stripeConfigured()) {
    return NextResponse.json({ error: "Payments not enabled." }, { status: 404 });
  }
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook not configured." }, { status: 500 });
  }
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  const raw = await request.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(raw, signature, secret);
  } catch (err) {
    console.error("stripe webhook signature verification failed", err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "account.updated": {
        // Cache whether the coach can now receive payouts (the bookable signal).
        const account = event.data.object as Stripe.Account;
        await prisma.coach.updateMany({
          where: { stripeAccountId: account.id },
          data: { stripePayoutsEnabled: Boolean(account.payouts_enabled) },
        });
        break;
      }
      case "checkout.session.completed": {
        // Payment captured to the platform. Confirm the held booking, record the
        // charge (for the later payout transfer), and email the invite.
        const cs = event.data.object as Stripe.Checkout.Session;
        const bookingId = Number(cs.metadata?.bookingId);
        if (!Number.isInteger(bookingId)) break;
        const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
        if (!booking || booking.status !== "PENDING_PAYMENT") break; // idempotent

        const piId =
          typeof cs.payment_intent === "string"
            ? cs.payment_intent
            : (cs.payment_intent?.id ?? null);
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
        // Only the first transition (count > 0) fires the invite, so Stripe
        // retries can't double-send.
        if (result.count > 0) {
          const studentTz = cs.metadata?.studentTz || "UTC";
          after(() => notifyBookingConfirmed(bookingId, studentTz));
        }
        break;
      }
      case "checkout.session.expired": {
        // Abandoned checkout — release the held slot (never touch a confirmed one).
        const cs = event.data.object as Stripe.Checkout.Session;
        const bookingId = Number(cs.metadata?.bookingId);
        if (Number.isInteger(bookingId)) {
          await prisma.booking.deleteMany({
            where: { id: bookingId, status: "PENDING_PAYMENT" },
          });
        }
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error(`stripe webhook handler failed for ${event.type}`, err);
    return NextResponse.json({ error: "Handler error." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
