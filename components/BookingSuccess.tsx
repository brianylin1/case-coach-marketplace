"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";
import { btnPrimary, btnSecondary } from "@/lib/ui";

type State = "checking" | "confirmed" | "pending";

// Shown after Stripe Checkout. The redirect can beat the webhook, so we poll
// the owner-scoped status endpoint briefly until the booking is CONFIRMED.
export function BookingSuccess({ bookingId }: { bookingId: number }) {
  const [state, setState] = useState<State>(
    Number.isInteger(bookingId) ? "checking" : "pending",
  );

  useEffect(() => {
    if (!Number.isInteger(bookingId)) return;
    let active = true;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function poll() {
      attempts += 1;
      try {
        const res = await fetch(`/api/bookings/${bookingId}/status`);
        if (res.ok) {
          const data = (await res.json()) as { status?: string };
          if (data.status === "CONFIRMED") {
            if (active) setState("confirmed");
            return;
          }
        }
      } catch {
        // transient; retry below
      }
      if (attempts >= 8) {
        if (active) setState("pending");
        return;
      }
      timer = setTimeout(poll, 2000);
    }

    poll();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [bookingId]);

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center sm:px-6">
      {state === "checking" ? (
        <>
          <Loader2 className="mx-auto size-10 animate-spin text-indigo-500" />
          <h1 className="mt-4 text-xl font-bold text-slate-900">
            Confirming your payment…
          </h1>
          <p className="mt-2 text-sm text-slate-600">This only takes a moment.</p>
        </>
      ) : state === "confirmed" ? (
        <>
          <CheckCircle2 className="mx-auto size-12 text-emerald-500" />
          <h1 className="mt-4 text-2xl font-bold text-slate-900">
            You&apos;re booked!
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Payment received and your session is confirmed. A calendar invite
            with the meeting link is on its way to your inbox.
          </p>
          <div className="mt-6 flex justify-center gap-2">
            <Link href="/dashboard" className={btnPrimary}>
              View my sessions
            </Link>
            <Link href="/sessions" className={btnSecondary}>
              Book another
            </Link>
          </div>
        </>
      ) : (
        <>
          <CheckCircle2 className="mx-auto size-12 text-emerald-500" />
          <h1 className="mt-4 text-2xl font-bold text-slate-900">
            Payment received
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            We&apos;re finalizing your booking. It will appear in your dashboard
            shortly, along with a calendar invite by email.
          </p>
          <div className="mt-6 flex justify-center">
            <Link href="/dashboard" className={btnPrimary}>
              Go to my dashboard
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
