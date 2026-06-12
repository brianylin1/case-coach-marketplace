import Stripe from "stripe";

// Lazy singleton. Never constructed at import time, so the app builds and runs
// with no Stripe keys (payments stay dormant behind PAYMENTS_ENABLED). Calling
// getStripe() without STRIPE_SECRET_KEY throws — only reached on a live path.
let client: Stripe | null = null;

export function getStripe(): Stripe {
  if (!client) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error("STRIPE_SECRET_KEY is not set");
    client = new Stripe(key);
  }
  return client;
}

// True when a secret key is configured. Use to decide whether the live Stripe
// path can run at all (kept separate from PAYMENTS_ENABLED, the product switch).
export function stripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}
