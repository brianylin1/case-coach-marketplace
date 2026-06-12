// Stripe Connect (Express) helpers. A coach onboards once to receive payouts;
// `payouts_enabled` on the account is our "this coach can be paid" signal,
// cached on Coach.stripePayoutsEnabled (kept fresh by the account.updated
// webhook, and synced here on return from onboarding / on re-click).

import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

export async function syncConnectAccount(
  coachId: number,
  accountId: string,
): Promise<boolean> {
  const account = await getStripe().accounts.retrieve(accountId);
  const enabled = Boolean(account.payouts_enabled);
  await prisma.coach.update({
    where: { id: coachId },
    data: { stripePayoutsEnabled: enabled },
  });
  return enabled;
}
