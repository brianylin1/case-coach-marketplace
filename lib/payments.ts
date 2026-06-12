// Payment seam. Today this is a simulation for the MVP; when Stripe is added,
// replace the body of `processPayment` with a real PaymentIntent confirmation
// (and add webhook handling) without touching the call sites in the booking
// API. Keeping the shape stable is the whole point of this file.

export type PaymentResult = {
  status: "SIMULATED" | "PAID";
  reference: string;
  amount: number;
};

export type PaymentInput = {
  amount: number; // USD
  description?: string;
};

export async function processPayment(input: PaymentInput): Promise<PaymentResult> {
  // Used only on the simulated path (PAYMENTS_ENABLED off) and for pro bono.
  const reference = `sim_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  return { status: "SIMULATED", reference, amount: input.amount };
}

// ----- Stripe payments (Phase 1, Option B: hold funds until after session) ---
//
// Master product switch. When false (the default), the app behaves exactly as
// the simulated MVP: bookings confirm instantly, no Stripe is ever touched.
// Flip on only after the live test-mode E2E passes.
export const PAYMENTS_ENABLED =
  process.env.PAYMENTS_ENABLED === "true" || process.env.PAYMENTS_ENABLED === "1";

// Platform take rate in basis points (1500 = 15%). Configurable per environment.
export const PLATFORM_FEE_BPS = (() => {
  const n = Number.parseInt(process.env.PLATFORM_FEE_BPS ?? "", 10);
  return Number.isFinite(n) && n >= 0 && n <= 10000 ? n : 1500;
})();

// Hours after a session ends before its held funds are released to the coach.
// A small buffer so a late "it didn't happen" lands while funds are still held
// (a clean refund, never a transfer reversal). Default 24h.
export const PAYOUT_HOLD_HOURS = (() => {
  const n = Number.parseInt(process.env.PAYOUT_HOLD_HOURS ?? "", 10);
  return Number.isFinite(n) && n >= 0 ? n : 24;
})();

export const CURRENCY = "usd";

export type PaymentSplit = {
  amountCents: number; // what the student is charged
  platformFeeCents: number; // Down to Case keeps this
  coachShareCents: number; // transferred to the coach after the session
};

// Split a whole-USD coach rate into charge / platform-fee / coach-share, all in
// cents. The platform keeps the fee; the coach receives the remainder later.
export function computeSplit(rateUsd: number): PaymentSplit {
  const amountCents = Math.max(0, Math.round(rateUsd * 100));
  const platformFeeCents = Math.round((amountCents * PLATFORM_FEE_BPS) / 10000);
  return {
    amountCents,
    platformFeeCents,
    coachShareCents: amountCents - platformFeeCents,
  };
}

// When releasing held funds: the instant a session's payout becomes eligible.
export function payoutReleaseAfter(sessionStart: Date, durationMins: number): Date {
  return new Date(
    sessionStart.getTime() + durationMins * 60_000 + PAYOUT_HOLD_HOURS * 3_600_000,
  );
}
