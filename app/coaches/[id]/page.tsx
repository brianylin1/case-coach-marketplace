import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  ArrowLeft,
  CalendarClock,
  ExternalLink,
  Lock,
  UserCog,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";
import { Avatar } from "@/components/Avatar";
import { FirmBadge } from "@/components/FirmBadge";
import { FocusTag } from "@/components/FocusTag";
import { RequestSessionForm } from "@/components/RequestSessionForm";
import { formatRate, parseList } from "@/lib/format";
import { btnPrimary, cardClass } from "@/lib/ui";

async function getCoach(idParam: string) {
  const id = Number(idParam);
  if (!Number.isInteger(id)) return null;
  return prisma.coach.findUnique({ where: { id } });
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const coach = await getCoach((await params).id);
  if (!coach) return { title: "Coach not found — CaseCoach" };
  return {
    title: `${coach.name} — ${coach.firm} ${coach.title} | CaseCoach`,
    description: coach.headline ?? coach.bio.slice(0, 150),
  };
}

export default async function CoachProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const coach = await getCoach((await params).id);
  if (!coach || !coach.isActive) notFound();

  const user = await getCurrentUser();
  const isStudent = user?.role === "student";
  const isOwnProfile = user?.role === "coach" && user.coach.id === coach.id;
  const focusKeys = parseList(coach.focusAreas);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <Link
        href="/coaches"
        className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900"
      >
        <ArrowLeft className="size-4" />
        All coaches
      </Link>

      <div className="mt-6 grid gap-8 lg:grid-cols-3">
        {/* Main */}
        <div className="lg:col-span-2">
          <div className="flex items-start gap-4">
            <Avatar name={coach.name} size="lg" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                  {coach.name}
                </h1>
                <FirmBadge firm={coach.firm} />
              </div>
              <p className="mt-1 text-slate-600">
                {coach.title} · {coach.yearsAtFirm} year
                {coach.yearsAtFirm === 1 ? "" : "s"} at {coach.firm}
              </p>
              {coach.headline && (
                <p className="mt-2 text-lg font-medium text-slate-800">
                  {coach.headline}
                </p>
              )}
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              About
            </h2>
            <p className="mt-2 whitespace-pre-line leading-relaxed text-slate-700">
              {coach.bio}
            </p>
          </div>

          <div className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Coaches on
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {focusKeys.map((key) => (
                <FocusTag key={key} focusKey={key} />
              ))}
            </div>
          </div>

          {(coach.availability || coach.linkedinUrl) && (
            <div className="mt-8 space-y-2 text-sm text-slate-600">
              {coach.availability && (
                <p className="flex items-center gap-2">
                  <CalendarClock className="size-4 text-slate-400" />
                  {coach.availability}
                </p>
              )}
              {coach.linkedinUrl && (
                <a
                  href={coach.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 font-medium text-indigo-600 hover:underline"
                >
                  <ExternalLink className="size-4" />
                  LinkedIn profile
                </a>
              )}
            </div>
          )}
        </div>

        {/* Sidebar: request panel */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className={`${cardClass} p-6`}>
            <div className="flex items-baseline justify-between">
              <span className="text-2xl font-bold text-slate-900">
                {formatRate(coach.hourlyRate)}
              </span>
              {coach.hourlyRate > 0 && (
                <span className="text-sm text-slate-400">per session hour</span>
              )}
            </div>

            <div className="mt-5">
              {isStudent ? (
                <RequestSessionForm
                  coachId={coach.id}
                  coachName={coach.name}
                  focusKeys={focusKeys}
                />
              ) : isOwnProfile ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-600">
                  <UserCog className="mx-auto size-6 text-slate-400" />
                  <p className="mt-2">This is how students see your profile.</p>
                  <Link
                    href="/dashboard"
                    className="mt-3 inline-block font-medium text-indigo-600 hover:underline"
                  >
                    Go to your dashboard →
                  </Link>
                </div>
              ) : user?.role === "coach" ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center text-sm text-slate-600">
                  <p>
                    You&apos;re signed in as a coach. Requests are sent by
                    students.
                  </p>
                </div>
              ) : (
                <div className="text-center">
                  <Lock className="mx-auto size-6 text-slate-400" />
                  <p className="mt-2 text-sm text-slate-600">
                    Create a free student account to request a session with{" "}
                    {coach.name.split(" ")[0]}.
                  </p>
                  <Link
                    href="/signup/student"
                    className={`${btnPrimary} mt-4 w-full`}
                  >
                    Sign up to request
                  </Link>
                  <p className="mt-3 text-xs text-slate-400">
                    Already have an account?{" "}
                    <Link href="/login" className="text-indigo-600 hover:underline">
                      Sign in
                    </Link>
                  </p>
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
