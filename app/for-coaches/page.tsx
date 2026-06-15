import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Check } from "lucide-react";
import { btnPrimary } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Send one link instead of ten texts · Down to Case",
  description:
    "People already ask you for case help. Send one link — they pick a time, pay, and get the invite. You just show up. Free to set up.",
};

// Outcome-first copy for consultants who already get asked for case help. The
// pitch is "stop coordinating it by hand," not "join a marketplace" — we never
// promise to bring them students. CTAs route into the existing /signup/coach
// flow, which ends at the dashboard's share-your-page link.
const benefits = [
  {
    title: "Save your time.",
    body: "Set it up once. Send the same link to everyone who asks.",
  },
  {
    title: "Skip the back-and-forth.",
    body: "They pick from times you already said yes to.",
  },
  {
    title: "Getting paid is easy.",
    body: "They pay when they book. No Venmo. No awkward “so… about payment.”",
  },
  {
    title: "It feels like a real service, not a favor.",
    body: "One link, a set price, a real booking — without making more work for yourself.",
  },
];

export default function ForCoachesPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-[-12%] h-[420px] w-[820px] max-w-[120vw] -translate-x-1/2 rounded-full bg-gradient-to-br from-indigo-200/60 via-violet-200/40 to-transparent blur-3xl" />
        </div>
        <div className="mx-auto max-w-3xl px-4 pb-12 pt-16 text-center sm:px-6 sm:pt-24">
          <h1 className="text-balance text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            People already ask you for case help. Send one link instead of ten
            texts.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-slate-600">
            They pick a time, pay, and get the invite. You just show up.
          </p>
          <div className="mt-8 flex flex-col items-center gap-2">
            <Link href="/signup/coach" className={`${btnPrimary} px-5 py-3 text-base`}>
              Get your link
              <ArrowRight className="size-5" />
            </Link>
            <span className="text-sm text-slate-500">Free to set up.</span>
          </div>
          <p className="mt-8 text-sm font-medium text-slate-700">
            For current and former consultants.
          </p>
        </div>
      </section>

      {/* The pain */}
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
          <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            The coaching takes an hour. The coordination never ends.
          </h2>
          <p className="mt-6 text-slate-700">
            Someone asks. You want to say yes. But you know what&apos;s coming:
          </p>
          <ul className="mt-4 space-y-2.5 text-slate-600">
            <li>Texts back and forth to find a time.</li>
            <li>The Venmo. The waiting. The little reminder nudge.</li>
            <li>The meeting link. The calendar invite.</li>
            <li>And the quiet hope they actually show up.</li>
          </ul>
          <p className="mt-6 font-medium text-slate-900">
            You just wanted to help. Now it&apos;s another chain of texts in your
            phone.
          </p>
        </div>
      </section>

      {/* The turn */}
      <section className="mx-auto max-w-2xl px-4 py-14 text-center sm:px-6">
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Send one link instead.
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-lg text-slate-700">
          They see the times you&apos;re free. They pick one. They pay. They get
          the invite.
        </p>
        <p className="mx-auto mt-3 max-w-xl text-slate-600">
          No texts. No Venmo. No chasing. Often done before you even reply.
        </p>
      </section>

      {/* Why it beats doing it yourself */}
      <section className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-2xl px-4 py-14 sm:px-6">
          <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Why that beats doing it yourself
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
            Easy to try. Easy to stop.
          </h2>
          <ul className="mx-auto mt-5 flex max-w-md flex-col gap-2 text-indigo-100">
            <li>Free to set up.</li>
            <li>Your price. Your hours. Your rules.</li>
            <li>Stop anytime.</li>
          </ul>
          <div className="mt-8">
            <Link
              href="/signup/coach"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 text-base font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-50"
            >
              Get your link
              <ArrowRight className="size-5" />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
