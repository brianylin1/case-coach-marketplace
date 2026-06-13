import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import { PAYMENTS_ENABLED } from "@/lib/payments";
import { syncConnectAccount } from "@/lib/connect";

// A logged-in coach starts (or resumes) Stripe Express onboarding. Creates the
// connected account on first call, then returns a hosted Account Link URL for
// the client to redirect to. Pinned to the coach's session id.
export async function POST(request: Request) {
  if (!PAYMENTS_ENABLED || !stripeConfigured()) {
    return NextResponse.json({ error: "Payments are not enabled." }, { status: 404 });
  }

  const session = await getSession();
  if (!session || session.role !== "coach") {
    return NextResponse.json({ error: "Sign in as a coach." }, { status: 401 });
  }

  const coach = await prisma.coach.findUnique({ where: { id: session.id } });
  if (!coach) {
    return NextResponse.json({ error: "Coach not found." }, { status: 404 });
  }

  try {
    const stripe = getStripe();
    let accountId = coach.stripeAccountId;
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: coach.email,
        capabilities: { transfers: { requested: true } },
        business_profile: {
          product_description: "Case interview coaching on Down to Case",
        },
        metadata: { coachId: String(coach.id) },
      });
      accountId = account.id;
      await prisma.coach.update({
        where: { id: coach.id },
        data: { stripeAccountId: accountId },
      });
    } else {
      // Reflect the latest onboarding state if they're resuming.
      await syncConnectAccount(coach.id, accountId).catch(() => {});
    }

    const origin = request.headers.get("origin") ?? new URL(request.url).origin;
    const link = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${origin}/dashboard?stripe=refresh`,
      return_url: `${origin}/dashboard?stripe=connected`,
      type: "account_onboarding",
    });

    return NextResponse.json({ url: link.url });
  } catch (err) {
    // Surface the real Stripe error as JSON instead of an unhandled empty 500
    // (which the client can't parse). Common first-time cause: the Connect
    // platform setup isn't finished in the Stripe dashboard.
    console.error("stripe connect onboarding failed", err);
    const message =
      err instanceof Error ? err.message : "Could not start Stripe onboarding.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
