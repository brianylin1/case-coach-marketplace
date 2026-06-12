import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";

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
  return NextResponse.json({
    status: booking.status,
    paymentStatus: booking.paymentStatus,
  });
}
