import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ArrowRight, Check } from "lucide-react";
import { btnPrimary } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Become a coach · Down to Case",
  description:
    "You just went through recruiting. Candidates want that insight. Set your times, share your link, and let them book you for affordable mock cases.",
};

// Positioning: speak to incoming consultants and recent offer holders. The hook
// is "you just went through recruiting, and that fresh insight is what
// candidates want." Helping them is easy, and the link quietly handles the
// scheduling and payment. CTAs route into the existing /signup/coach flow,
// which ends at the dashboard's share-your-page link.
const benefits = [
  {
    title: "Get paid for it.",
    body: "Set your own rate. Charge what you want, or coach for free.",
  },
  {
    title: "Your experience is what they want.",
    body: "You just did this. That fresh memory is exactly what candidates need.",
  },
  {
    title: "No back-and-forth.",
    body: "They pick from times you're already free. Nothing to plan.",
  },
  {
    title: "Just show up.",
    body: "The time, the invite, even the payment are handled before you reply.",
  },
];

// The transformation, shown not told. Two phone-style threads, both from the
// coach's point of view: incoming (student) bubbles left + gray, outgoing
// (coach) bubbles right + indigo. The "old way" is deliberately long and
// believable; the "easy way" is four messages. Plain data so the markup stays
// a simple map.
type ChatMsg = { from: "student" | "coach"; text?: string; link?: boolean };

const oldWay: ChatMsg[] = [
  { from: "student", text: "Hey! Any chance you could do a mock case with me sometime?" },
  { from: "coach", text: "Yeah, happy to. What days are you free?" },
  { from: "student", text: "Pretty open this week after 5!" },
  { from: "coach", text: "I’m slammed Tue/Wed… Thursday?" },
  { from: "student", text: "Thursday I have class till 6:30 😩" },
  { from: "coach", text: "Friday morning then?" },
  { from: "student", text: "Friday works. 10am?" },
  { from: "coach", text: "Perfect. I’ll dig up a Zoom link" },
  { from: "student", text: "Amazing, thank you!! And what do I owe you?" },
  { from: "coach", text: "Don’t worry about it… $40 if you want, Venmo’s fine" },
  { from: "student", text: "Sent! Wait — what’s your handle again?" },
];

const easyWay: ChatMsg[] = [
  { from: "student", text: "Can you help me case?" },
  { from: "coach", text: "Sure. I’m down to case." },
  { from: "coach", link: true },
  { from: "student", text: "Booked." },
];

function Bubble({
  from,
  children,
}: {
  from: "student" | "coach";
  children: ReactNode;
}) {
  const isCoach = from === "coach";
  return (
    <div className={`flex ${isCoach ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[82%] rounded-2xl px-3.5 py-2 text-sm leading-snug ${
          isCoach
            ? "rounded-br-sm bg-indigo-600 text-white"
            : "rounded-bl-sm bg-slate-200 text-slate-800"
        }`}
      >
        {children}
      </div>
    </div>
  );
}

function Thread({ messages }: { messages: ChatMsg[] }) {
  return (
    <div className="space-y-2">
      {messages.map((m, i) => (
        <Bubble key={i} from={m.from}>
          {m.link ? (
            <>
              Book a time here:
              <span className="mt-1.5 block rounded-lg bg-white/15 px-2.5 py-1.5 font-medium underline decoration-white/40 underline-offset-2">
                downtocase.com/with/you
              </span>
            </>
          ) : (
            m.text
          )}
        </Bubble>
      ))}
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
            You just went through recruiting.
          </p>
          <h1 className="text-balance mt-4 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            You got the offer. Candidates want to know how you did it.
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-slate-600">
            Help them with what you just learned, and get paid for it.
          </p>
          <div className="mt-8 flex flex-col items-center gap-2">
            <Link href="/signup/coach" className={`${btnPrimary} px-5 py-3 text-base`}>
              Get your link
              <ArrowRight className="size-5" />
            </Link>
            <span className="text-sm text-slate-500">Free to set up.</span>
          </div>
          <p className="mt-8 text-sm font-medium text-slate-700">
            For incoming consultants and recent offer holders.
          </p>
        </div>
      </section>

      {/* The transformation, shown not told */}
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6">
          <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Same favor. A lot less hassle.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-center text-slate-600">
            The coaching is exactly the same. Everything around it isn&apos;t.
          </p>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {/* The old way */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5 sm:p-6">
              <p className="mb-5 text-center text-xs font-semibold uppercase tracking-wider text-slate-500">
                The old way
              </p>
              <Thread messages={oldWay} />
              <p className="mt-5 text-center text-sm font-medium text-slate-500">
                …and you haven&apos;t even booked a room yet.
              </p>
            </div>
            {/* The easy way */}
            <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-5 sm:p-6">
              <p className="mb-5 text-center text-xs font-semibold uppercase tracking-wider text-indigo-600">
                The easy way
              </p>
              <Thread messages={easyWay} />
              <p className="mt-5 text-center text-sm font-semibold text-slate-900">
                Done.
              </p>
            </div>
          </div>
        </div>
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
