import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import { PAYMENTS_ENABLED } from "@/lib/payments";

// Releases held funds to coaches once a session has happened and the hold
// window has elapsed. Triggered by Vercel Cron, which sends
// `Authorization: Bearer ${CRON_SECRET}`. Idempotent: only HELD rows are picked
// up, and each transfer uses a per-booking idempotency key (so a retry can't
// double-pay and self-heals if a previous attempt actually went through).
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  if (!PAYMENTS_ENABLED || !stripeConfigured()) {
    return NextResponse.json({ skipped: "payments disabled" });
  }

  const due = await prisma.booking.findMany({
    where: {
      status: "CONFIRMED",
      payoutStatus: "HELD",
      payoutReleaseAfter: { lte: new Date() },
      coachStripeAccountId: { not: null },
      stripeChargeId: { not: null },
      coachShareCents: { gt: 0 },
    },
    take: 50,
    orderBy: { payoutReleaseAfter: "asc" },
  });

  let released = 0;
  let failed = 0;
  for (const booking of due) {
    if (
      booking.coachShareCents == null ||
      !booking.coachStripeAccountId ||
      !booking.stripeChargeId
    ) {
      continue;
    }
    try {
      const transfer = await getStripe().transfers.create(
        {
          amount: booking.coachShareCents,
          currency: booking.currency || "usd",
          destination: booking.coachStripeAccountId,
          transfer_group: `booking_${booking.id}`,
          source_transaction: booking.stripeChargeId,
          metadata: { bookingId: String(booking.id) },
        },
        { idempotencyKey: `transfer_booking_${booking.id}` },
      );
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          payoutStatus: "RELEASED",
          stripeTransferId: transfer.id,
          payoutReleasedAt: new Date(),
        },
      });
      released += 1;
    } catch (err) {
      // Leave HELD so the next run retries; the idempotency key keeps that safe.
      console.error(`payout release failed for booking ${booking.id}`, err);
      failed += 1;
    }
  }

  return NextResponse.json({ due: due.length, released, failed });
}
