import Link from "next/link";
import type { Metadata } from "next";
import { btnPrimary } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Checkout canceled · Down to Case",
};

export default function BookingCancelPage() {
  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center sm:px-6">
      <h1 className="text-2xl font-bold text-slate-900">Checkout canceled</h1>
      <p className="mt-2 text-sm text-slate-600">
        No payment was taken and the time was not booked. The slot is released
        shortly if you do not complete checkout.
      </p>
      <div className="mt-6 flex justify-center">
        <Link href="/sessions" className={btnPrimary}>
          Back to sessions
        </Link>
      </div>
    </div>
  );
}
