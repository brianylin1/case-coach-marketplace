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
    // Most common cause: the account hasn't finished onboarding, so Stripe
    // won't issue a login link yet. Surface a real message instead of an
    // opaque 500 (and point them at finishing setup).
    console.error("stripe login link failed", err);
    const message =
      err instanceof Error ? err.message : "Could not open your Stripe dashboard.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
