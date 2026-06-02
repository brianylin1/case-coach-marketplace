import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { CalendarClock, Inbox, Mail, Search } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { Avatar } from "@/components/Avatar";
import { FirmBadge } from "@/components/FirmBadge";
import { FocusTag } from "@/components/FocusTag";
import { StatusBadge } from "@/components/StatusBadge";
import { AvailabilityGrid } from "@/components/AvailabilityGrid";
import { focusLabel } from "@/lib/constants";
import { blocksToCellKeys } from "@/lib/availability";
import { formatRate, formatSlotParts, parseList } from "@/lib/format";
import { btnPrimary, btnSecondary, cardClass } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Your dashboard — CaseCoach",
};

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user.role === "student" ? (
    <StudentDashboard studentId={user.student.id} />
  ) : (
    <CoachDashboard coachId={user.coach.id} />
  );
}

/* ----------------------------- Student view ----------------------------- */

async function StudentDashboard({ studentId }: { studentId: number }) {
  const now = new Date();
  const [student, bookings] = await Promise.all([
    prisma.student.findUniqueOrThrow({ where: { id: studentId } }),
    prisma.booking.findMany({
      where: { studentId, status: "CONFIRMED", startTime: { gte: now } },
      include: { coach: true },
      orderBy: { startTime: "asc" },
    }),
  ]);

  const firms = parseList(student.targetFirms);
  const focus = parseList(student.focusAreas);

  return (
    <Shell
      title={`Welcome, ${student.name.split(" ")[0]}`}
      subtitle="Your upcoming sessions, all in one place."
      action={
        <Link href="/sessions" className={btnPrimary}>
          <Search className="size-4" />
          Book a session
        </Link>
      }
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">
            Upcoming sessions
          </h2>
          {bookings.length === 0 ? (
            <EmptyState
              title="No sessions booked yet"
              body="Browse open slots and book a coach instantly — you'll see their contact details the moment you book."
              cta={
                <Link href="/sessions" className={btnPrimary}>
                  <Search className="size-4" />
                  Find a session
                </Link>
              }
            />
          ) : (
            <ul className="space-y-4">
              {bookings.map((b) => {
                const when = formatSlotParts(b.startTime);
                return (
                  <li key={b.id} className={`${cardClass} p-5`}>
                    <div className="flex items-start justify-between gap-3">
                      <Link
                        href={`/coaches/${b.coachId}`}
                        className="flex items-center gap-3 hover:opacity-80"
                      >
                        <Avatar name={b.coach.name} />
                        <div>
                          <p className="font-semibold text-slate-900">
                            {b.coach.name}
                          </p>
                          <p className="text-sm text-slate-500">
                            {b.coach.title} · {b.coach.firm}
                          </p>
                        </div>
                      </Link>
                      <StatusBadge status={b.status} />
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-600">
                      <span className="inline-flex items-center gap-1.5 font-medium text-slate-800">
                        <CalendarClock className="size-4 text-slate-400" />
                        {when.dateLabel} · {when.timeLabel}
                      </span>
                      {b.focusArea && (
                        <>
                          <span className="text-slate-300">·</span>
                          <FocusTag focusKey={b.focusArea} />
                        </>
                      )}
                    </div>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-sm">
                      <a
                        href={`mailto:${b.coach.email}`}
                        className="inline-flex items-center gap-1.5 font-medium text-indigo-600 hover:underline"
                      >
                        <Mail className="size-4" />
                        {b.coach.email}
                      </a>
                      <span className="text-xs text-slate-400">
                        Paid {formatRate(b.pricePaid)} · simulated
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <aside className="space-y-4">
          <div className={`${cardClass} p-5`}>
            <h3 className="font-semibold text-slate-900">Your profile</h3>
            <dl className="mt-3 space-y-3 text-sm">
              <Field label="Email">{student.email}</Field>
              <Field label="Target firms">
                {firms.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {firms.map((f) => (
                      <FirmBadge key={f} firm={f} />
                    ))}
                  </div>
                ) : (
                  <span className="text-slate-400">Not set</span>
                )}
              </Field>
              <Field label="Focus areas">
                {focus.length ? (
                  <div className="flex flex-wrap gap-1.5">
                    {focus.map((f) => (
                      <FocusTag key={f} focusKey={f} />
                    ))}
                  </div>
                ) : (
                  <span className="text-slate-400">Not set</span>
                )}
              </Field>
              {student.timeline && <Field label="Timeline">{student.timeline}</Field>}
            </dl>
            <Link href="/signup/student" className={`${btnSecondary} mt-4 w-full`}>
              Update preferences
            </Link>
          </div>
        </aside>
      </div>
    </Shell>
  );
}

/* ------------------------------ Coach view ------------------------------ */

async function CoachDashboard({ coachId }: { coachId: number }) {
  const now = new Date();
  const [coach, bookings] = await Promise.all([
    prisma.coach.findUniqueOrThrow({
      where: { id: coachId },
      include: { blocks: true },
    }),
    prisma.booking.findMany({
      where: { coachId, status: "CONFIRMED", startTime: { gte: now } },
      include: { student: true },
      orderBy: { startTime: "asc" },
    }),
  ]);

  const initialCellKeys = blocksToCellKeys(coach.blocks);
  const earnings = bookings.reduce((sum, b) => sum + b.pricePaid, 0);
  const focus = parseList(coach.focusAreas);

  return (
    <Shell
      title={`Welcome, ${coach.name.split(" ")[0]}`}
      subtitle="Paint your weekly availability and see who's booked you."
      action={
        <Link href={`/coaches/${coach.id}`} className={btnSecondary}>
          View public profile
        </Link>
      }
    >
      <div className="mb-6 grid grid-cols-3 gap-4">
        <Stat label="Hrs/week" value={`${initialCellKeys.length}`} accent="indigo" />
        <Stat label="Upcoming" value={`${bookings.length}`} accent="emerald" />
        <Stat label="Booked value" value={`$${earnings}`} accent="amber" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <AvailabilityGrid initialCellKeys={initialCellKeys} />
        </div>

        <aside className={`${cardClass} h-fit p-5`}>
          <div className="flex items-center gap-3">
            <Avatar name={coach.name} />
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-900">{coach.name}</p>
              <FirmBadge firm={coach.firm} />
            </div>
          </div>
          <dl className="mt-4 space-y-3 text-sm">
            <Field label="Role">
              {coach.title} · {coach.yearsAtFirm} yr{coach.yearsAtFirm === 1 ? "" : "s"}
            </Field>
            <Field label="Rate">{formatRate(coach.hourlyRate)}</Field>
            <Field label="Coaches on">
              <div className="flex flex-wrap gap-1.5">
                {focus.map((f) => (
                  <FocusTag key={f} focusKey={f} />
                ))}
              </div>
            </Field>
          </dl>
          <Link href="/signup/coach" className={`${btnSecondary} mt-4 w-full`}>
            Edit profile
          </Link>
        </aside>
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Booked sessions</h2>
        {bookings.length === 0 ? (
          <EmptyState
            title="No bookings yet"
            body="Paint a few green hours above — students can book them instantly, and they'll show up here."
            cta={null}
          />
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {bookings.map((b) => {
              const when = formatSlotParts(b.startTime);
              return (
                <li key={b.id} className={`${cardClass} p-5`}>
                  <div className="flex items-center gap-3">
                    <Avatar name={b.student.name} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-900">
                        {b.student.name}
                      </p>
                      <p className="text-sm text-slate-500">
                        {b.focusArea ? focusLabel(b.focusArea) : "Case coaching"}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 flex items-center gap-2 text-sm font-medium text-slate-800">
                    <CalendarClock className="size-4 text-slate-400" />
                    {when.dateLabel} · {when.timeLabel}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-sm">
                    <a
                      href={`mailto:${b.student.email}`}
                      className="inline-flex items-center gap-1.5 font-medium text-indigo-600 hover:underline"
                    >
                      <Mail className="size-4" />
                      {b.student.email}
                    </a>
                    <span className="text-xs text-slate-400">{formatRate(b.pricePaid)}</span>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </Shell>
  );
}

/* ------------------------------ Primitives ------------------------------ */

function Shell({
  title,
  subtitle,
  action,
  children,
}: {
  title: string;
  subtitle: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-1 text-slate-600">{subtitle}</p>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </dt>
      <dd className="mt-1 text-slate-700">{children}</dd>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "amber" | "emerald" | "indigo";
}) {
  const accents = {
    amber: "text-amber-600",
    emerald: "text-emerald-600",
    indigo: "text-indigo-600",
  };
  return (
    <div className={`${cardClass} p-4 text-center`}>
      <p className={`text-2xl font-bold ${accents[accent]}`}>{value}</p>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
    </div>
  );
}

function EmptyState({
  title,
  body,
  cta,
}: {
  title: string;
  body: string;
  cta: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-12 text-center">
      <Inbox className="size-8 text-slate-400" />
      <h3 className="mt-3 font-semibold text-slate-900">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{body}</p>
      {cta && <div className="mt-4">{cta}</div>}
    </div>
  );
}
