import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { stripeConfigured } from "@/lib/stripe";
import { PAYMENTS_ENABLED } from "@/lib/payments";
import { createExpressLoginLink } from "@/lib/connect";

// A connected coach opens their Stripe-hosted Express dashboard (single-use
// login link) to manage payouts, bank/tax details, and any required
// verification. Pure account management — onboarding lives separately in
// /api/stripe/connect, and this route never creates accounts or onboarding links.
export async function POST() {
  if (!PAYMENTS_ENABLED || !stripeConfigured()) {
    return NextResponse.json({ error: "Payments are not enabled." }, { status: 404 });
  }

  const session = await getSession();
  if (!session || session.role !== "coach") {
    return NextResponse.json({ error: "Sign in as a coach." }, { status: 401 });
  }

  const coach = await prisma.coach.findUnique({ where: { id: session.id } });
  if (!coach?.stripeAccountId) {
    return NextResponse.json(
      { error: "Connect payouts first to manage your Stripe account." },
      { status: 409 },
    );
  }

  try {
    const url = await createExpressLoginLink(coach.stripeAccountId);
    return NextResponse.json({ url });
  } catch (err) {
    console.error("stripe login link failed", err);
    const message =
      err instanceof Error ? err.message : "Could not open your Stripe dashboard.";

    // Self-heal a stored Connect account that can't be used under the current
    // (live) Stripe key — e.g. a leftover **test-mode** account, or one that no
    // longer exists. Such an account can never produce a login link, so clear the
    // stale association (only the two Stripe fields, only this coach) and tell the
    // coach to reconnect; the normal "Connect payouts" flow (/api/stripe/connect)
    // then creates a fresh **live** account. Gated to definitive "wrong account"
    // errors so a transient failure never disconnects a healthy coach.
    if (/test ?mode|live mode key|No such account|similar object exists/i.test(message)) {
      await prisma.coach
        .update({
          where: { id: coach.id },
          data: { stripeAccountId: null, stripePayoutsEnabled: false },
        })
        .catch(() => {});
      return NextResponse.json(
        {
          error:
            "Your payout account needs to be reconnected. Refresh this page, then choose “Connect payouts”.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json({ error: message }, { status: 502 });
  }
}
