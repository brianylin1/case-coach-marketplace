import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { stripeConfigured } from "@/lib/stripe";
import { reconcileBooking } from "@/lib/booking-reconcile";

// Lets the student's /booking/success page poll their own booking until the
// Stripe webhook flips it to CONFIRMED (the redirect can beat the webhook).
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || session.role !== "student") {
    return NextResponse.json({ error: "Not authorized." }, { status: 401 });
  }
  const { id } = await params;
  const bookingId = Number(id);
  if (!Number.isInteger(bookingId)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking || booking.studentId !== session.id) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  let status = booking.status;
  let paymentStatus = booking.paymentStatus;
  // Confirm-on-return: if still awaiting payment, verify with Stripe directly so
  // a delayed or lost webhook never leaves a paying student unconfirmed.
  if (status === "PENDING_PAYMENT" && stripeConfigured()) {
    status = await reconcileBooking(bookingId);
    if (status === "CONFIRMED") paymentStatus = "PAID";
  }
  return NextResponse.json({ status, paymentStatus });
}
