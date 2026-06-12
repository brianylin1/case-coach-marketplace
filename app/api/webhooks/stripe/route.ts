import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import { PAYMENTS_ENABLED } from "@/lib/payments";

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
      default:
        break;
    }
  } catch (err) {
    console.error(`stripe webhook handler failed for ${event.type}`, err);
    return NextResponse.json({ error: "Handler error." }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
