import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ArrowRight, Check, X, Zap } from "lucide-react";
import { btnPrimary } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Become a coach · Down to Case",
  description:
    "Turn your consulting offer into credible paid coaching without marketing yourself from scratch. Create a profile and let candidates find and book you.",
};

// Positioning: the real pain isn't scheduling, it's self-marketing. Incoming
// consultants and recent offer holders want to coach, but not to post "hire me"
// or build a coaching brand next to a new job. So we lead with access and
// credibility (a profile candidates can find and book); scheduling and payment
// are secondary. Honest about demand: the candidate side is still growing, so
// the copy says "find and book you," never "we'll get you students." CTAs route
// into the existing /signup/coach flow.

// Benefits, ordered: discovery and credibility first, scheduling/payment last.
const benefits = [
  {
    title: "Get discovered by candidates.",
    body: "As we grow the candidate side, your profile gives people a clean way to find and book you. No marketing yourself from scratch.",
  },
  {
    title: "Look credible without a coaching brand.",
    body: "Your firm, offer status, and focus areas do the talking. There is no personal brand to build.",
  },
  {
    title: "Turn recruiting into paid sessions.",
    body: "You just went through it. Put that fresh experience to work in short, paid mock cases.",
  },
  {
    title: "Set your rate and availability.",
    body: "You choose what you charge and when you are free. Change it anytime.",
  },
  {
    title: "Scheduling and payment handled.",
    body: "Booking, calendar invites, and payment run on their own, so you just show up.",
  },
];

// The shift, shown side by side: marketing yourself vs. a profile candidates
// find and book. Plain data so the markup stays a simple map.
const oldWay = [
  "Posting “DM me for case coaching” feels awkward",
  "Explaining your background over and over",
  "Random DMs to answer",
  "“How much do you charge?”",
  "“What times work for you?”",
  "Venmo back-and-forth",
];

const newWay = [
  "Candidates find you by firm, offer, and focus",
  "They book from your open times",
  "Payment and calendar invite handled",
];

function Friction({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-500">
        <X className="size-3.5" />
      </span>
      <span className="text-sm text-slate-600">{children}</span>
    </li>
  );
}

function Win({ children }: { children: ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
        <Check className="size-3.5" />
      </span>
      <span className="text-sm text-slate-700">{children}</span>
    </li>
  );
}

// A small, non-cartoonish mock of a coach profile, mirroring the real card look
// so the "new way" feels concrete (sample data, not a real coach).
function ProfileMock() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
          AR
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-900">Alex R.</p>
          <p className="text-xs text-slate-500">Incoming McKinsey Associate</p>
        </div>
        <span className="ml-auto rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-600/20">
          McKinsey
        </span>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {["Structuring", "Market sizing", "Behavioral"].map((t) => (
          <span
            key={t}
            className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
          >
            {t}
          </span>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
        <span className="text-sm font-semibold text-slate-900">
          $60<span className="font-normal text-slate-400">/hr</span>
        </span>
        <span className="inline-flex items-center gap-1 rounded-md bg-indigo-600 px-2.5 py-1.5 text-xs font-semibold text-white">
          <Zap className="size-3.5" /> Book
        </span>
      </div>
    </div>
  );
}

export default function ForCoachesPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-[-12%] h-[420px] w-[820px] max-w-[120vw] -translate-x-1/2 rounded-full bg-gradient-to-br from-indigo-200/60 via-violet-200/40 to-transparent blur-3xl" />
        </div>
        <div className="mx-auto max-w-3xl px-4 pb-12 pt-16 text-center sm:px-6 sm:pt-24">
          <p className="text-base font-medium text-indigo-600">
            You just got the offer.
          </p>
          <h1 className="text-balance mt-4 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            We help candidates find you.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-slate-600">
            Candidates want advice from people who just went through recruiting.
            A simple profile gives them a clean way to find and book you, so you
            can coach without marketing yourself, chasing DMs, or collecting
            payment.
          </p>
          <div className="mt-8 flex flex-col items-center gap-2">
            <Link href="/signup/coach" className={`${btnPrimary} px-5 py-3 text-base`}>
              Create your profile
              <ArrowRight className="size-5" />
            </Link>
            <span className="text-sm text-slate-500">Free to set up.</span>
          </div>
          <p className="mt-8 text-sm font-medium text-slate-700">
            For incoming consultants and recent offer holders.
          </p>
        </div>
      </section>

      {/* The shift: marketing yourself vs. a profile candidates find and book */}
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
          <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Coach without marketing yourself.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-slate-600">
            The coaching is the easy part. Putting yourself out there is the part
            most people would rather skip.
          </p>
          <div className="mt-10 grid items-start gap-6 sm:grid-cols-2">
            {/* Doing it yourself */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
              <p className="mb-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                Doing it yourself
              </p>
              <div className="rounded-xl border border-slate-200 bg-white p-3 text-sm italic text-slate-500">
                &ldquo;Hey everyone, I just finished consulting recruiting and
                I&apos;m doing case coaching on the side. DM me if
                you&apos;re interested.&rdquo;
              </div>
              <ul className="mt-4 space-y-2.5">
                {oldWay.map((t) => (
                  <Friction key={t}>{t}</Friction>
                ))}
              </ul>
            </div>
            {/* On Down to Case */}
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-5 sm:p-6">
              <p className="mb-4 text-center text-xs font-semibold uppercase tracking-wider text-indigo-600">
                On Down to Case
              </p>
              <ProfileMock />
              <ul className="mt-4 space-y-2.5">
                {newWay.map((t) => (
                  <Win key={t}>{t}</Win>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
          <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Why coach on Down to Case
          </h2>
          <ul className="mt-8 space-y-5">
            {benefits.map((b) => (
              <li key={b.title} className="flex gap-3">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                  <Check className="size-4" />
                </span>
                <p className="text-slate-700">
                  <span className="font-semibold text-slate-900">{b.title}</span>{" "}
                  {b.body}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 px-6 py-12 text-center shadow-lg sm:px-12">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Get your profile ready.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-indigo-100">
            Set up your profile now and be part of the early coach group, so
            you are ready as the candidate side grows.
          </p>
          <ul className="mx-auto mt-5 flex max-w-md flex-col gap-2 text-indigo-100">
            <li>Free to set up.</li>
            <li>Your rate. Your hours. Your rules.</li>
            <li>Stop anytime.</li>
          </ul>
          <div className="mt-8">
            <Link
              href="/signup/coach"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 text-base font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-50"
            >
              Create your profile
              <ArrowRight className="size-5" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
