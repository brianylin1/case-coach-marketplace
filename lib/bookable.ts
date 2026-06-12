import { Prisma } from "@/app/generated/prisma/client";
import { PAYMENTS_ENABLED } from "@/lib/payments";

// Prisma where-fragment for coaches a student can actually book: active, with a
// configured meeting room, and — when payments are on — able to be paid. Paid
// coaches need payouts enabled; pro bono coaches (rate 0) never need Stripe.
// Callers may add firm/focus/price filters on top (combined as AND).
export function bookableCoachWhere(): Prisma.CoachWhereInput {
  const where: Prisma.CoachWhereInput = {
    isActive: true,
    meetingUrl: { not: null },
    meetingPlatform: { not: null },
  };
  if (PAYMENTS_ENABLED) {
    where.OR = [{ hourlyRate: 0 }, { stripePayoutsEnabled: true }];
  }
  return where;
}

// In-memory equivalent for a single loaded coach (e.g. the profile page).
export function isCoachPayable(coach: {
  hourlyRate: number;
  stripePayoutsEnabled: boolean;
}): boolean {
  if (!PAYMENTS_ENABLED) return true;
  return coach.hourlyRate === 0 || coach.stripePayoutsEnabled;
}
