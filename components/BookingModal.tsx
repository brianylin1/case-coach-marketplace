"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { Modal } from "./Modal";
import { Avatar } from "./Avatar";
import { FirmBadge } from "./FirmBadge";
import { formatRate } from "@/lib/format";
import { btnPrimary, btnSecondary } from "@/lib/ui";
import type { SlotView } from "@/lib/types";

type BookedResult = {
  id: number;
  pricePaid: number;
  coach: { name: string; email: string; firm: string; title: string };
};

// Controlled by parent via `slot` (null = closed). Two steps: review + simulated
// payment, then a confirmation that reveals the coach's contact details.
export function BookingModal({
  slot,
  isStudent,
  onClose,
  onBooked,
}: {
  slot: SlotView | null;
  isStudent: boolean;
  onClose: () => void;
  onBooked: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BookedResult | null>(null);

  function close() {
    const booked = Boolean(result);
    setError(null);
    setResult(null);
    setLoading(false);
    onClose();
    if (booked) onBooked();
  }

  async function pay() {
    if (!slot) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coachId: slot.coach.id, startTime: slot.startISO }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not complete the booking.");
        return;
      }
      setResult(data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal open={Boolean(slot)} onClose={close}>
      {slot && !result && (
        <div className="p-6">
          <h2 className="text-lg font-bold text-slate-900">
            {isStudent ? "Confirm your session" : "Book this session"}
          </h2>

          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-3">
              <Avatar name={slot.coach.name} />
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-slate-900">{slot.coach.name}</p>
                  <FirmBadge firm={slot.coach.firm} />
                </div>
                <p className="text-sm text-slate-500">{slot.coach.title}</p>
              </div>
            </div>
            <p className="mt-3 flex items-center gap-2 text-sm text-slate-700">
              <CalendarClock className="size-4 text-slate-400" />
              {slot.dateLabel} · {slot.timeLabel} · {slot.durationMins} min
            </p>
          </div>

          {isStudent ? (
            <>
              <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 p-4">
                <span className="text-sm text-slate-600">Total</span>
                <span className="text-lg font-bold text-slate-900">
                  {formatRate(slot.coach.hourlyRate)}
                </span>
              </div>
              <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
                <CreditCard className="mt-0.5 size-4 shrink-0" />
                <span>
                  <strong>Payment simulation for MVP.</strong> No card is charged
                  — this is the placeholder where Stripe checkout will go.
                </span>
              </div>
              {error && (
                <p className="mt-3 flex items-center gap-2 text-sm text-red-700">
                  <AlertCircle className="size-4 shrink-0" />
                  {error}
                </p>
              )}
              <button
                onClick={pay}
                disabled={loading}
                className={`${btnPrimary} mt-4 w-full`}
              >
                <ShieldCheck className="size-4" />
                {loading
                  ? "Processing…"
                  : `Book instantly · ${formatRate(slot.coach.hourlyRate)}`}
              </button>
              <p className="mt-2 text-center text-xs text-slate-400">
                You&apos;ll get {slot.coach.name.split(" ")[0]}&apos;s contact
                details right after booking.
              </p>
            </>
          ) : (
            <div className="mt-4 text-center">
              <p className="text-sm text-slate-600">
                Create a free student account to book this session.
              </p>
              <Link href="/signup/student" className={`${btnPrimary} mt-4 w-full`}>
                Sign up to book
              </Link>
              <p className="mt-2 text-xs text-slate-400">
                Already have an account?{" "}
                <Link href="/login" className="text-indigo-600 hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          )}
        </div>
      )}

      {slot && result && (
        <div className="p-6 text-center">
          <CheckCircle2 className="mx-auto size-12 text-emerald-500" />
          <h2 className="mt-3 text-xl font-bold text-slate-900">You&apos;re booked!</h2>
          <p className="mt-1 text-sm text-slate-600">
            Your session with {result.coach.name} is confirmed.
          </p>
          <p className="mt-3 inline-flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <CalendarClock className="size-4 text-slate-400" />
            {slot.dateLabel} · {slot.timeLabel}
          </p>
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
            <p className="font-medium text-emerald-900">
              Reach out to lock in the details:
            </p>
            <a
              href={`mailto:${result.coach.email}`}
              className="mt-1 inline-flex items-center gap-1.5 font-semibold text-emerald-700 hover:underline"
            >
              <Mail className="size-4" />
              {result.coach.email}
            </a>
          </div>
          <p className="mt-3 text-xs text-slate-400">
            Paid {formatRate(result.pricePaid)} · Payment simulated (MVP)
          </p>
          <div className="mt-4 flex gap-2">
            <button onClick={close} className={`${btnSecondary} flex-1`}>
              Done
            </button>
            <Link href="/dashboard" className={`${btnPrimary} flex-1`}>
              View my sessions
            </Link>
          </div>
        </div>
      )}
    </Modal>
  );
}
