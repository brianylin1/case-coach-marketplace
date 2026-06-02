import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  GraduationCap,
  MessageSquare,
  Search,
  ShieldCheck,
  Target,
  UserPlus,
  Zap,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { CoachCard } from "@/components/CoachCard";
import { FIRM_STYLES } from "@/lib/constants";
import { btnPrimary, btnSecondary, cardClass } from "@/lib/ui";

export default async function HomePage() {
  const [featured, coachCount] = await Promise.all([
    prisma.coach.findMany({
      where: { isActive: true },
      take: 3,
      orderBy: { createdAt: "asc" },
    }),
    prisma.coach.count({ where: { isActive: true } }),
  ]);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-[-12%] h-[420px] w-[820px] max-w-[120vw] -translate-x-1/2 rounded-full bg-gradient-to-br from-indigo-200/60 via-violet-200/40 to-transparent blur-3xl" />
        </div>
        <div className="mx-auto max-w-6xl px-4 pb-12 pt-16 text-center sm:px-6 sm:pt-24">
          <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-sm font-medium text-slate-600 shadow-sm">
            <Target className="size-4 text-indigo-600" />
            Case interview prep, 1:1
          </span>
          <h1 className="mx-auto mt-6 max-w-3xl text-balance text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl md:text-6xl">
            Crack the case with coaches who&apos;ve sat in the chair.
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
            Browse open coaching slots from current and former McKinsey, Bain,
            and BCG consultants — and book one instantly. Pick a time, confirm,
            done. No request forms, no waiting to hear back.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/sessions" className={`${btnPrimary} px-5 py-3 text-base`}>
              <Search className="size-5" />
              Find a session
            </Link>
            <Link
              href="/signup/coach"
              className={`${btnSecondary} px-5 py-3 text-base`}
            >
              I&apos;m an MBB coach
              <ArrowRight className="size-5" />
            </Link>
          </div>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-sm text-slate-500">
            <span className="font-medium text-slate-700">
              {coachCount} coaches taking bookings this week
            </span>
            <span className="hidden text-slate-300 sm:inline">•</span>
            <div className="flex items-center gap-4">
              {(["McKinsey", "Bain", "BCG"] as const).map((firm) => (
                <span key={firm} className="inline-flex items-center gap-1.5">
                  <span className={`size-2 rounded-full ${FIRM_STYLES[firm].dot}`} />
                  {firm}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured coaches */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Coaches you can book this week
            </h2>
            <p className="mt-1 text-slate-600">
              Real consultants with open slots — tap in to see their times.
            </p>
          </div>
          <Link
            href="/sessions"
            className="hidden text-sm font-medium text-indigo-600 hover:underline sm:inline"
          >
            See all sessions →
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
          See all sessions →
        </Link>
      </section>

      {/* How it works */}
      <section className="border-y border-slate-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900">
            How CaseCoach works
          </h2>
          <div className="mt-10 grid gap-10 md:grid-cols-2">
            <div>
              <div className="flex items-center gap-2 text-indigo-600">
                <GraduationCap className="size-5" />
                <span className="font-semibold">For students</span>
              </div>
              <ol className="mt-5 space-y-5">
                <Step
                  n={1}
                  Icon={Search}
                  title="Find a time"
                  body="Browse open slots by day, firm, focus area, and price."
                />
                <Step
                  n={2}
                  Icon={Zap}
                  title="Book instantly"
                  body="Reserve in two clicks — no waiting to hear back. (Payments are simulated in this MVP.)"
                />
                <Step
                  n={3}
                  Icon={MessageSquare}
                  title="Meet your coach"
                  body="Their contact details unlock the moment you book. Then get the reps that win offers."
                />
              </ol>
              <Link href="/sessions" className={`${btnPrimary} mt-6`}>
                Find a session
              </Link>
            </div>
            <div>
              <div className="flex items-center gap-2 text-indigo-600">
                <ShieldCheck className="size-5" />
                <span className="font-semibold">For MBB coaches</span>
              </div>
              <ol className="mt-5 space-y-5">
                <Step
                  n={1}
                  Icon={UserPlus}
                  title="Create your profile"
                  body="Firm, title, focus areas, and your rate (or coach pro bono). A minute, tops."
                />
                <Step
                  n={2}
                  Icon={CalendarCheck}
                  title="Set your availability"
                  body="Add up to 5 open slots whenever you're free to coach."
                />
                <Step
                  n={3}
                  Icon={Zap}
                  title="Get booked"
                  body="Students book and pay instantly — they just show up in your dashboard."
                />
              </ol>
              <Link href="/signup/coach" className={`${btnSecondary} mt-6`}>
                Become a coach
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
            title="Coaches from the firms"
            body="Current and former MBB consultants — including people who've interviewed candidates themselves."
          />
          <Feature
            Icon={Zap}
            title="Instant booking"
            body="Pick a slot and you're confirmed — no request forms, no waiting. Contact details unlock on booking."
          />
          <Feature
            Icon={Target}
            title="Filter to fit"
            body="Sort open sessions by day, firm, focus area, and price to find exactly the right rep."
          />
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 px-6 py-12 text-center shadow-lg sm:px-12">
          <h2 className="text-2xl font-bold text-white sm:text-3xl">
            Your next case could be the one that lands the offer.
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-indigo-100">
            Find an open slot and book a coach in two clicks — or open your own
            calendar and start coaching.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link
              href="/sessions"
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-white px-5 py-3 text-base font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-50"
            >
              <Search className="size-5" />
              Book a session
            </Link>
            <Link
              href="/signup/coach"
              className="inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-base font-semibold text-white ring-1 ring-inset ring-white/50 transition hover:bg-white/10"
            >
              Coach with us
            </Link>
          </div>
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
