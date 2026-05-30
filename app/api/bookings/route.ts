import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { str } from "@/lib/validation";
import { processPayment } from "@/lib/payments";

// A logged-in student books an open slot instantly. Payment is simulated via
// lib/payments.ts (swap for Stripe later). Returns the coach's contact details,
// which are only revealed once a booking is confirmed.
export async function POST(request: Request) {
  const session = await getSession();
  if (!session || session.role !== "student") {
    return NextResponse.json(
      { error: "Sign in as a student to book a session." },
      { status: 401 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const slotId = Number(body.slotId);
  const focusArea = str(body.focusArea, 60) || null;
  if (!Number.isInteger(slotId)) {
    return NextResponse.json({ error: "Unknown slot." }, { status: 400 });
  }

  const slot = await prisma.slot.findUnique({
    where: { id: slotId },
    include: { coach: true },
  });
  if (!slot || !slot.coach.isActive) {
    return NextResponse.json({ error: "That session isn't available." }, { status: 404 });
  }
  if (slot.isBooked) {
    return NextResponse.json(
      { error: "Sorry — that time was just booked. Pick another." },
      { status: 409 },
    );
  }
  if (new Date(slot.startTime) <= new Date()) {
    return NextResponse.json({ error: "That time has already passed." }, { status: 409 });
  }

  const amount = slot.coach.hourlyRate;
  const payment = await processPayment({
    amount,
    description: `CaseCoach session with ${slot.coach.name}`,
  });

  try {
    // Re-check inside a transaction; the unique slotId on Booking is the
    // hard guarantee against double-booking under a race.
    const booking = await prisma.$transaction(async (tx) => {
      const fresh = await tx.slot.findUnique({ where: { id: slotId } });
      if (!fresh || fresh.isBooked) throw new Error("ALREADY_BOOKED");
      await tx.slot.update({ where: { id: slotId }, data: { isBooked: true } });
      return tx.booking.create({
        data: {
          slotId,
          studentId: session.id,
          coachId: slot.coachId,
          focusArea,
          pricePaid: amount,
          paymentStatus: payment.status,
          paymentRef: payment.reference,
          status: "CONFIRMED",
        },
      });
    });

    return NextResponse.json({
      id: booking.id,
      pricePaid: amount,
      paymentStatus: payment.status,
      coach: {
        name: slot.coach.name,
        email: slot.coach.email,
        firm: slot.coach.firm,
        title: slot.coach.title,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Sorry — that time was just booked. Pick another." },
      { status: 409 },
    );
  }
}
