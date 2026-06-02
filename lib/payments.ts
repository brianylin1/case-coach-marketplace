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
  // TODO(stripe): create + confirm a PaymentIntent for `input.amount` and
  // return its id as `reference` with status "PAID".
  const reference = `sim_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  return { status: "SIMULATED", reference, amount: input.amount };
}

export const PAYMENT_IS_SIMULATED = true;
