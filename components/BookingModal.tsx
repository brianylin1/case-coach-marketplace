"use client";

import { useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { Modal } from "./Modal";
import { Avatar } from "./Avatar";
import { FirmBadge } from "./FirmBadge";
import { MeetingActions, type BookingMeetingView } from "./MeetingActions";
import { bestForPhrase, casesCoachedLabel, firmStatusWord } from "@/lib/constants";
import { formatRate } from "@/lib/format";
import { btnPrimary, btnSecondary } from "@/lib/ui";
import type { SlotView } from "@/lib/types";

type BookedResult = {
  id: number;
  pricePaid: number;
  meeting: BookingMeetingView;
  coach: { name: string; email: string; firm: string; title: string };
};

// Controlled by parent via `slot` (null = closed). Review step, then either a
// redirect to Stripe Checkout (paid) or an instant confirmation revealing the
// coach's contact details (pro bono / simulated).
export function BookingModal({
  slot,
  isStudent,
  paymentsEnabled,
  onClose,
  onBooked,
}: {
  slot: SlotView | null;
  isStudent: boolean;
  paymentsEnabled: boolean;
  onClose: () => void;
  onBooked: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BookedResult | null>(null);

  // Concise trust signals for the review step (all optional).
  const coach = slot?.coach;
  const coachBestFor = coach ? bestForPhrase(coach.bestFor, coach.focusKeys) : null;
  const coachCases = coach ? casesCoachedLabel(coach.casesCoached) : null;
  const coachStatusWord = coach ? firmStatusWord(coach.firmStatus) : null;
  const coachStatus = coachStatusWord ? `${coachStatusWord} ` : "";

  // Whether this booking will collect real money now (vs. instant/free path).
  const willCharge = paymentsEnabled && (slot?.coach.hourlyRate ?? 0) > 0;

  // The viewer's local-zone abbreviation (e.g. "EDT", or "GMT+5:30" where there's
  // no common name), shown next to the session time so the booking time is never
  // ambiguous at the commit moment — especially when the coach is in another zone.
  // Computed in the browser, so it reflects the viewer's actual zone. This subtree
  // only renders after a click (slot is set client-side), so there's no SSR/hydration concern.
  const tzAbbr = slot
    ? (new Intl.DateTimeFormat(undefined, { timeZoneName: "short" })
        .formatToParts(new Date(slot.startISO))
        .find((p) => p.type === "timeZoneName")?.value ?? "")
    : "";

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
      if (data.checkoutUrl) {
        // Paid path: hand off to Stripe Checkout. Confirmation happens on the
        // /booking/success page once the webhook records payment.
        window.location.href = data.checkoutUrl as string;
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
              <Avatar name={slot.coach.name} src={slot.coach.photoUrl} />
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-slate-900">{slot.coach.name}</p>
                  <FirmBadge firm={slot.coach.firm} />
                </div>
                <p className="text-sm text-slate-500">
                  {coachStatus}
                  {slot.coach.title}
                  {slot.coach.yearsAtFirm > 0
                    ? ` · ${slot.coach.yearsAtFirm} yr${slot.coach.yearsAtFirm === 1 ? "" : "s"}`
                    : ""}
                </p>
              </div>
            </div>
            {(coachBestFor || coachCases) && (
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {coachBestFor && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-1 font-medium text-indigo-700">
                    Best for {coachBestFor}
                  </span>
                )}
                {coachCases && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 font-medium text-slate-600">
                    {coachCases}
                  </span>
                )}
              </div>
            )}
            <p className="mt-3 flex items-center gap-2 text-sm text-slate-700">
              <CalendarClock className="size-4 text-slate-400" />
              {slot.dateLabel} · {slot.timeLabel}
              {tzAbbr ? ` ${tzAbbr}` : ""} · {slot.durationMins} min
            </p>
            <p className="mt-1 pl-6 text-xs text-slate-400">Shown in your local time.</p>
            {slot.coach.linkedinUrl && (
              <a
                href={slot.coach.linkedinUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline"
              >
                <ExternalLink className="size-3.5" />
                LinkedIn
              </a>
            )}
          </div>

          {isStudent ? (
            <>
              <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 p-4">
                <span className="text-sm text-slate-600">Total</span>
                <span className="text-lg font-bold text-slate-900">
                  {formatRate(slot.coach.hourlyRate)}
                </span>
              </div>
              {paymentsEnabled ? (
                willCharge ? (
                  <div className="mt-3 flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
                    <CreditCard className="mt-0.5 size-4 shrink-0" />
                    <span>
                      You&apos;ll continue to secure Stripe checkout. Your payment
                      is held by Down to Case and released to your coach after the
                      session.
                    </span>
                  </div>
                ) : (
                  <div className="mt-3 flex items-start gap-2 rounded-lg bg-emerald-50 px-3 py-2.5 text-sm text-emerald-800">
                    <ShieldCheck className="mt-0.5 size-4 shrink-0" />
                    <span>This session is free, so you&apos;ll be booked instantly.</span>
                  </div>
                )
              ) : (
                <div className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2.5 text-sm text-amber-800">
                  <CreditCard className="mt-0.5 size-4 shrink-0" />
                  <span>
                    <strong>Payment simulation for MVP.</strong> No card is charged
                    — this is the placeholder where Stripe checkout will go.
                  </span>
                </div>
              )}
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
                  : willCharge
                    ? `Continue to checkout · ${formatRate(slot.coach.hourlyRate)}`
                    : `Book instantly · ${formatRate(slot.coach.hourlyRate)}`}
              </button>
              <p className="mt-2 text-center text-xs text-slate-400">
                {willCharge
                  ? `You'll get ${slot.coach.name.split(" ")[0]}'s contact details right after payment.`
                  : `You'll get ${slot.coach.name.split(" ")[0]}'s contact details right after booking.`}
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
          <h2 className="mt-3 text-xl font-bold text-slate-900">Session confirmed</h2>
          <p className="mt-1 text-sm text-slate-600">
            Your session with {result.coach.name} is confirmed.
          </p>
          <p className="mt-3 inline-flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <CalendarClock className="size-4 text-slate-400" />
            {slot.dateLabel} · {slot.timeLabel}
            {tzAbbr ? ` ${tzAbbr}` : ""}
          </p>
          <p className="mt-3 text-sm text-slate-600">
            Calendar invite sent to your email. It includes the meeting link and
            joining details.
          </p>

          <div className="mt-4 rounded-xl border border-slate-200 p-4 text-left">
            <MeetingActions
              variant="student"
              bookingId={result.id}
              title={`Down to Case: mock case with ${result.coach.name}`}
              start={new Date(slot.startISO)}
              durationMins={slot.durationMins}
              meeting={result.meeting}
            />
          </div>

          <p className="mt-3 text-xs text-slate-400">
            Backup contact:{" "}
            <a
              href={`mailto:${result.coach.email}`}
              className="font-medium text-slate-500 hover:underline"
            >
              {result.coach.email}
            </a>
          </p>
          <p className="mt-1 text-xs text-slate-400">
            {paymentsEnabled
              ? formatRate(result.pricePaid)
              : `Paid ${formatRate(result.pricePaid)} · Payment simulated (MVP)`}
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
