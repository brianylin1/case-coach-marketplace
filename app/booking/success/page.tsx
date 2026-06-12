import type { Metadata } from "next";
import { BookingSuccess } from "@/components/BookingSuccess";

export const metadata: Metadata = {
  title: "Booking confirmed · Down to Case",
};

export default async function BookingSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ b?: string }>;
}) {
  const { b } = await searchParams;
  return <BookingSuccess bookingId={Number(b)} />;
}
