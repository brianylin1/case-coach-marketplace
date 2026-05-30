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
import { RequestActions } from "@/components/RequestActions";
import { focusLabel } from "@/lib/constants";
import { formatRate, parseList, timeAgo } from "@/lib/format";
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
  const [student, requests] = await Promise.all([
    prisma.student.findUniqueOrThrow({ where: { id: studentId } }),
    prisma.sessionRequest.findMany({
      where: { studentId },
      include: { coach: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const firms = parseList(student.targetFirms);
  const focus = parseList(student.focusAreas);

  return (
    <Shell
      title={`Welcome, ${student.name.split(" ")[0]}`}
      subtitle="Track your session requests and find more coaches."
      action={
        <Link href="/coaches" className={btnPrimary}>
          <Search className="size-4" />
          Browse coaches
        </Link>
      }
    >
      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">
            Your requests
          </h2>
          {requests.length === 0 ? (
            <EmptyState
              title="No requests yet"
              body="Browse coaches and send your first session request — it only takes a moment."
              cta={
                <Link href="/coaches" className={btnPrimary}>
                  <Search className="size-4" />
                  Find a coach
                </Link>
              }
            />
          ) : (
            <ul className="space-y-4">
              {requests.map((req) => (
                <li key={req.id} className={`${cardClass} p-5`}>
                  <div className="flex items-start justify-between gap-3">
                    <Link
                      href={`/coaches/${req.coach.id}`}
                      className="flex items-center gap-3 hover:opacity-80"
                    >
                      <Avatar name={req.coach.name} />
                      <div>
                        <p className="font-semibold text-slate-900">
                          {req.coach.name}
                        </p>
                        <p className="text-sm text-slate-500">
                          {req.coach.title} · {req.coach.firm}
                        </p>
                      </div>
                    </Link>
                    <StatusBadge status={req.status} />
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                    <FocusTag focusKey={req.focusArea} />
                    <span>·</span>
                    <span>{timeAgo(req.createdAt)}</span>
                  </div>
                  <p className="mt-3 text-sm text-slate-700">{req.message}</p>
                  {req.status === "ACCEPTED" && (
                    <ContactBanner
                      label={`${req.coach.name.split(" ")[0]} accepted! Reach out to schedule:`}
                      email={req.coach.email}
                    />
                  )}
                </li>
              ))}
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
              {student.timeline && (
                <Field label="Timeline">{student.timeline}</Field>
              )}
              {student.goal && <Field label="Goal">{student.goal}</Field>}
            </dl>
            <Link
              href="/signup/student"
              className={`${btnSecondary} mt-4 w-full`}
            >
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
  const [coach, requests] = await Promise.all([
    prisma.coach.findUniqueOrThrow({ where: { id: coachId } }),
    prisma.sessionRequest.findMany({
      where: { coachId },
      include: { student: true },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  // Pending first so the coach sees what needs action.
  const order = { PENDING: 0, ACCEPTED: 1, DECLINED: 2 } as Record<string, number>;
  const sorted = [...requests].sort(
    (a, b) => (order[a.status] ?? 3) - (order[b.status] ?? 3),
  );
  const pendingCount = requests.filter((r) => r.status === "PENDING").length;
  const acceptedCount = requests.filter((r) => r.status === "ACCEPTED").length;
  const focus = parseList(coach.focusAreas);

  return (
    <Shell
      title={`Welcome, ${coach.name.split(" ")[0]}`}
      subtitle="Review incoming requests and manage your profile."
      action={
        <Link href={`/coaches/${coach.id}`} className={btnSecondary}>
          View public profile
        </Link>
      }
    >
      <div className="mb-6 grid grid-cols-3 gap-4">
        <Stat label="Pending" value={pendingCount} accent="amber" />
        <Stat label="Accepted" value={acceptedCount} accent="emerald" />
        <Stat label="Total" value={requests.length} accent="indigo" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <section className="lg:col-span-2">
          <h2 className="mb-3 text-lg font-semibold text-slate-900">
            Incoming requests
          </h2>
          {sorted.length === 0 ? (
            <EmptyState
              title="No requests yet"
              body="When students request a session with you, they'll show up here. Make sure your profile highlights what you coach."
              cta={
                <Link href={`/coaches/${coach.id}`} className={btnSecondary}>
                  View your profile
                </Link>
              }
            />
          ) : (
            <ul className="space-y-4">
              {sorted.map((req) => (
                <li key={req.id} className={`${cardClass} p-5`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar name={req.student.name} />
                      <div>
                        <p className="font-semibold text-slate-900">
                          {req.student.name}
                        </p>
                        <p className="text-sm text-slate-500">
                          wants help with {focusLabel(req.focusArea)}
                        </p>
                      </div>
                    </div>
                    <StatusBadge status={req.status} />
                  </div>
                  <p className="mt-3 text-sm text-slate-700">{req.message}</p>
                  {req.proposedTimes && (
                    <p className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                      <CalendarClock className="size-4 text-slate-400" />
                      {req.proposedTimes}
                    </p>
                  )}
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <span className="text-xs text-slate-400">
                      {timeAgo(req.createdAt)}
                    </span>
                    {req.status === "PENDING" ? (
                      <RequestActions requestId={req.id} />
                    ) : req.status === "ACCEPTED" ? (
                      <a
                        href={`mailto:${req.student.email}`}
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:underline"
                      >
                        <Mail className="size-4" />
                        {req.student.email}
                      </a>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <aside className="space-y-4">
          <div className={`${cardClass} p-5`}>
            <div className="flex items-center gap-3">
              <Avatar name={coach.name} />
              <div className="min-w-0">
                <p className="truncate font-semibold text-slate-900">
                  {coach.name}
                </p>
                <FirmBadge firm={coach.firm} />
              </div>
            </div>
            <dl className="mt-4 space-y-3 text-sm">
              <Field label="Role">
                {coach.title} · {coach.yearsAtFirm} yr
                {coach.yearsAtFirm === 1 ? "" : "s"}
              </Field>
              <Field label="Rate">{formatRate(coach.hourlyRate)}</Field>
              <Field label="Coaches on">
                <div className="flex flex-wrap gap-1.5">
                  {focus.map((f) => (
                    <FocusTag key={f} focusKey={f} />
                  ))}
                </div>
              </Field>
              {coach.availability && (
                <Field label="Availability">{coach.availability}</Field>
              )}
            </dl>
            <Link href="/signup/coach" className={`${btnSecondary} mt-4 w-full`}>
              Edit profile
            </Link>
          </div>
        </aside>
      </div>
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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {title}
          </h1>
          <p className="mt-1 text-slate-600">{subtitle}</p>
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
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
  value: number;
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
      <div className="mt-4">{cta}</div>
    </div>
  );
}

function ContactBanner({ label, email }: { label: string; email: string }) {
  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2.5 text-sm">
      <span className="text-emerald-800">{label}</span>
      <a
        href={`mailto:${email}`}
        className="inline-flex items-center gap-1.5 font-medium text-emerald-700 hover:underline"
      >
        <Mail className="size-4" />
        {email}
      </a>
    </div>
  );
}
