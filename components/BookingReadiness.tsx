import Link from "next/link";
import {
  AlertCircle,
  CalendarClock,
  CircleCheck,
  CreditCard,
  Sparkles,
  Video,
} from "lucide-react";
import { meetingPlatformLabel } from "@/lib/constants";
import { ConnectPayoutsButton } from "@/components/ConnectPayoutsButton";
import { btnPrimary, btnSecondary } from "@/lib/ui";

export type PolishItem = { key: string; label: string };

type ReadinessStep = {
  key: string;
  done: boolean;
  Icon: React.ComponentType<{ className?: string }>;
  title: string;
  why: string;
  summary: string;
  action: (primary: boolean) => React.ReactNode;
};

// The single "Get booking-ready" surface on the coach dashboard. Leads with
// booking status, then lists only the steps that actually gate bookings:
// availability, a meeting room, and — when payments are on and the coach
// charges — Stripe payouts. Rate is set on the profile form, not here (a pro
// bono coach is fully bookable), and optional profile polish stays separate.
export function BookingReadiness({
  hasAvailability,
  availabilityHours,
  hasMeeting,
  meetingPlatform,
  paymentsEnabled,
  hourlyRate,
  payoutsEnabled,
  hasStripeAccount,
  polish,
}: {
  hasAvailability: boolean;
  availabilityHours: number;
  hasMeeting: boolean;
  meetingPlatform: string | null;
  paymentsEnabled: boolean;
  hourlyRate: number;
  payoutsEnabled: boolean;
  hasStripeAccount: boolean;
  polish: PolishItem[];
}) {
  // Payouts gate paid bookings, but only when payments are enabled AND the coach
  // actually charges. Pro bono coaches (and the payments-off world) never see
  // it — keeping the checklist to the gates that truly apply.
  const showPayouts = paymentsEnabled && hourlyRate > 0;

  const steps: ReadinessStep[] = [
    {
      key: "availability",
      done: hasAvailability,
      Icon: CalendarClock,
      title: "Set your availability",
      why: "Paint the weekly hours you're open. Students can only book times you've marked available.",
      summary: `${availabilityHours} hr${availabilityHours === 1 ? "" : "s"}/week open`,
      action: (primary) => (
        <a href="#availability" className={primary ? btnPrimary : btnSecondary}>
          Set hours
        </a>
      ),
    },
    {
      key: "meeting",
      done: hasMeeting,
      Icon: Video,
      title: "Add your meeting room",
      why: "Add the Zoom, Teams, or Meet link you'll reuse for every session — it goes into each student's calendar invite.",
      summary: `${meetingPlatformLabel(meetingPlatform)} · linked`,
      action: (primary) => (
        <Link
          href="/signup/coach?section=meeting"
          className={primary ? btnPrimary : btnSecondary}
        >
          Add room
        </Link>
      ),
    },
    ...(showPayouts
      ? [
          {
            key: "payouts",
            done: payoutsEnabled,
            Icon: CreditCard,
            title: "Connect payouts with Stripe",
            why: `You charge $${hourlyRate}/hr. Connect Stripe so students can pay and you're paid automatically after each session.`,
            summary: "Stripe connected",
            action: (primary: boolean) => (
              <ConnectPayoutsButton
                className={primary ? btnPrimary : btnSecondary}
                label={hasStripeAccount ? "Finish payout setup" : "Connect payouts"}
              />
            ),
          } satisfies ReadinessStep,
        ]
      : []),
  ];

  const total = steps.length;
  const doneCount = steps.filter((s) => s.done).length;
  const bookable = doneCount === total;
  const remaining = total - doneCount;
  const firstIncomplete = steps.find((s) => !s.done)?.key;

  if (bookable) {
    return (
      <section className="mb-6 rounded-2xl border border-emerald-300 bg-emerald-50/60 p-5">
        <div className="flex items-start gap-3">
          <CircleCheck className="mt-0.5 size-6 shrink-0 text-emerald-600" />
          <div>
            <h2 className="font-semibold text-emerald-900">
              You&apos;re ready to accept bookings
            </h2>
            <p className="mt-0.5 text-sm text-emerald-800/80">
              Students can find you on the calendar and book instantly.
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 pl-9 text-sm text-emerald-900/80">
          {steps.map((s) => (
            <span key={s.key} className="inline-flex items-center gap-1.5">
              <CircleCheck className="size-4 text-emerald-600" /> {s.summary}
            </span>
          ))}
        </div>
        {polish.length > 0 && (
          <div className="mt-4 ml-9 rounded-xl border border-slate-200 bg-white/80 p-3">
            <p className="flex items-center gap-1.5 text-sm font-medium text-slate-700">
              <Sparkles className="size-4 text-indigo-500" /> Make your profile stand
              out
            </p>
            <p className="mt-0.5 text-xs text-slate-500">
              Optional — these help students choose you.
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {polish.map((p) => (
                <Link
                  key={p.key}
                  href="/signup/coach"
                  className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-indigo-400 hover:text-indigo-600"
                >
                  {p.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="mb-6 rounded-2xl border border-amber-300 bg-amber-50/60 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 size-6 shrink-0 text-amber-600" />
          <div>
            <h2 className="font-semibold text-amber-900">Not bookable yet</h2>
            <p className="mt-0.5 text-sm text-amber-800/80">
              {remaining === 1
                ? "One step left — finish to go live."
                : "Finish these steps and students can book you instantly."}
            </p>
          </div>
        </div>
        <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
          {doneCount} of {total} done
        </span>
      </div>

      <ul className="mt-3 divide-y divide-amber-200/70 border-t border-amber-200/70">
        {steps.map((step) => {
          const Icon = step.Icon;
          const primary = step.key === firstIncomplete;
          return (
            <li key={step.key} className="flex items-start gap-3 py-3">
              <span className="mt-0.5 shrink-0">
                {step.done ? (
                  <CircleCheck className="size-5 text-emerald-600" />
                ) : (
                  <Icon className="size-5 text-slate-400" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
                  <p
                    className={`font-medium ${step.done ? "text-slate-500" : "text-slate-900"}`}
                  >
                    {step.title}
                  </p>
                  {step.done ? (
                    <span className="text-sm text-slate-500">{step.summary}</span>
                  ) : (
                    step.action(primary)
                  )}
                </div>
                {!step.done && (
                  <p className="mt-1 max-w-prose text-sm text-slate-600">{step.why}</p>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
