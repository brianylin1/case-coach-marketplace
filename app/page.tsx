import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  MessageSquare,
  Search,
  ShieldCheck,
  Target,
  Zap,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { CoachCard } from "@/components/CoachCard";
import { bookableCoachWhere } from "@/lib/bookable";
import { btnPrimary, btnSecondary, cardClass } from "@/lib/ui";

export default async function HomePage() {
  // Only coaches who've configured a meeting room are bookable, so the homepage
  // never features a coach a visitor can't actually book (mirrors /sessions).
  const featured = await prisma.coach.findMany({
    where: bookableCoachWhere(),
    take: 3,
    orderBy: { createdAt: "asc" },
  });

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-[-12%] h-[420px] w-[820px] max-w-[120vw] -translate-x-1/2 rounded-full bg-gradient-to-br from-indigo-200/60 via-violet-200/40 to-transparent blur-3xl" />
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-12 pt-16 text-center sm:px-6 sm:pt-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-600 shadow-sm">
            <Zap className="size-4 text-indigo-600" />
            Live mock case interviews
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-balance text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl md:text-6xl">
            Practice cases with people who just got offers.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
            Book mock cases with incoming consultants and recent offer holders
            from top firms.
          </p>
          <p className="mx-auto mt-3 max-w-xl text-sm text-slate-500">
            Pick a time, book instantly, meet your coach. No request forms, no
            waiting.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/sessions" className={`${btnPrimary} px-5 py-3 text-base`}>
              <CalendarCheck className="size-5" />
              Book a mock case
            </Link>
            <Link
              href="/for-coaches"
              className={`${btnSecondary} px-5 py-3 text-base`}
            >
              Become a coach
            </Link>
          </div>
          <p className="mt-8 text-sm font-medium text-slate-700">
            People who recently went through recruiting at McKinsey, Bain, BCG,
            and other top firms.
          </p>
        </div>
      </section>

      {/* Featured coaches — only rendered when there are bookable coaches */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                Who you&apos;ll practice with
              </h2>
              <p className="mt-1 text-slate-600">
                Incoming consultants and recent offer holders. Tap a coach to
                see their open times.
              </p>
            </div>
            <Link
              href="/sessions"
              className="hidden text-sm font-medium text-indigo-600 hover:underline sm:inline"
            >
              See open times →
            </Link>
          </div>
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((coach) => (
              <CoachCard key={coach.id} coach={coach} />
            ))}
          </div>
          <Link
            href="/sessions"
            className="mt-6 inline-block text-sm font-medium text-indigo-600 hover:underline sm:hidden"
          >
            See open times →
          </Link>
        </section>
      )}

      {/* How it works */}
      <section
        id="how-it-works"
        className="scroll-mt-20 border-y border-slate-200 bg-white"
      >
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900">
            How Down to Case works
          </h2>
          <div className="mx-auto mt-10 max-w-xl">
            <ol className="space-y-5">
              <Step
                n={1}
                Icon={Search}
                title="Find a time"
                body="Open the calendar and pick a session time that works for you."
              />
              <Step
                n={2}
                Icon={Zap}
                title="Book instantly"
                body="Reserve in two clicks. You're confirmed on the spot, no waiting to hear back."
              />
              <Step
                n={3}
                Icon={MessageSquare}
                title="Run your case"
                body="Your coach's meeting link lands in your inbox right away. Show up and get the reps that count."
              />
            </ol>
            <div className="mt-8 text-center">
              <Link
                href="/sessions"
                className={`${btnPrimary} px-5 py-3 text-base`}
              >
                <CalendarCheck className="size-5" />
                Book a mock case
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Value props */}
      <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-6 sm:grid-cols-3">
          <Feature
            Icon={ShieldCheck}
            title="People who just did it"
            body="Practice with incoming consultants and recent offer holders. They went through the same interviews not long ago, so they remember what actually worked."
          />
          <Feature
            Icon={Zap}
            title="Booked in two clicks"
            body="Pick a time and you're confirmed. No request forms, no waiting. Your meeting details arrive instantly."
          />
          <Feature
            Icon={Target}
            title="The right rep, every time"
            body="See each coach's firm, focus, and what they're best for up front, so every session targets exactly what you need to work on."
          />
        </div>
      </section>

      {/* Why recent offer holders — the core argument, kept plain and honest */}
      <section className="mx-auto max-w-3xl px-4 pb-14 sm:px-6">
        <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900">
          Why practice with recent offer holders?
        </h2>
        <div className="mx-auto mt-6 max-w-2xl space-y-4 text-slate-600">
          <p>
            They just did what you are trying to do. They remember the cases,
            the pressure, and the mistakes that cost people. That makes their
            feedback practical and fresh.
          </p>
          <p>
            Practicing with friends is cheap, but you are both still learning. A
            professional coach can cost $200 or more an hour. This is the middle
            option: affordable reps with someone who recently passed the process.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="scroll-mt-20 border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
          <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900">
            Common questions
          </h2>
          <dl className="mt-8 divide-y divide-slate-200">
            <Faq
              q="Who are the coaches?"
              a="Mostly incoming consultants and recent offer holders who just went through recruiting. Some are current or former consultants too. You can see each coach's background and what they're best for before you book."
            />
            <Faq
              q="Do I have to be targeting McKinsey, Bain, or BCG?"
              a="No. Down to Case is for any top consulting interview, not just MBB."
            />
            <Faq
              q="What happens in a session?"
              a="A live, 60-minute mock case or focused coaching over video. You run a real case, then get direct feedback on where you stand and what to fix."
            />
            <Faq
              q="What does it cost?"
              a="Each coach sets their own rate, shown up front before you book, per 60-minute session. No subscriptions, no packages."
            />
          </dl>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 px-6 py-12 text-center shadow-lg sm:px-12">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Stop guessing what good looks like.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-indigo-100">
            Book a live mock case with someone who recently passed the process
            and find out where you really stand.
          </p>
          <div className="mt-7 flex justify-center">
            <Link
              href="/sessions"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 text-base font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-50"
            >
              <CalendarCheck className="size-5" />
              Book a mock case
            </Link>
          </div>
        </div>
      </section>

      {/* Coach path — placed after all student content so it never competes
          with the student journey. Routes to the /for-coaches persuasion page. */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-white px-6 py-8 text-center sm:flex-row sm:justify-between sm:gap-6 sm:text-left">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Did you just get an offer?
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Candidates want to know how you did it. This is an easy way to
              help them and get paid for it.
            </p>
          </div>
          <Link
            href="/for-coaches"
            className={`${btnSecondary} shrink-0 px-5 py-2.5`}
          >
            Become a coach
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>
    </>
  );
}

function Step({
  n,
  Icon,
  title,
  body,
}: {
  n: number;
  Icon: typeof Search;
  title: string;
  body: string;
}) {
  return (
    <li className="flex gap-4">
      <span className="relative flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
        <Icon className="size-5" />
        <span className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
          {n}
        </span>
      </span>
      <div>
        <h3 className="font-semibold text-slate-900">{title}</h3>
        <p className="mt-0.5 text-sm text-slate-600">{body}</p>
      </div>
    </li>
  );
}

function Feature({
  Icon,
  title,
  body,
}: {
  Icon: typeof Search;
  title: string;
  body: string;
}) {
  return (
    <div className={`${cardClass} p-6`}>
      <span className="inline-flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
        <Icon className="size-5" />
      </span>
      <h3 className="mt-4 font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 text-sm text-slate-600">{body}</p>
    </div>
  );
}

function Faq({ q, a }: { q: string; a: string }) {
  return (
    <div className="py-5">
      <dt className="font-semibold text-slate-900">{q}</dt>
      <dd className="mt-1.5 text-sm text-slate-600">{a}</dd>
    </div>
  );
}
