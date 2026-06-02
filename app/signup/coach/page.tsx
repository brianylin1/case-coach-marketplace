import Link from "next/link";
import type { Metadata } from "next";
import { CoachSignupForm } from "@/components/CoachSignupForm";
import { getViewerTimeZone } from "@/lib/viewer-tz";
import { cardClass } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Coach with CaseCoach — for MBB consultants",
};

export default async function CoachSignupPage() {
  // The coach is a viewer too — default their timezone to their detected zone.
  const defaultTimezone = await getViewerTimeZone();
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Coach the next generation
        </h1>
        <p className="mt-2 text-slate-600">
          Set up your profile, then accept the requests that fit your schedule.
          Charge what you like — or coach pro bono.
        </p>
      </div>
      <div className={`${cardClass} mt-8 p-6 sm:p-8`}>
        <CoachSignupForm defaultTimezone={defaultTimezone} />
      </div>
      <div className="mt-6 space-y-1 text-center text-sm text-slate-500">
        <p>
          Looking for a coach instead?{" "}
          <Link
            href="/signup/student"
            className="font-medium text-indigo-600 hover:underline"
          >
            Sign up as a student
          </Link>
        </p>
        <p>
          Already have an account?{" "}
          <Link
            href="/login?role=coach"
            className="font-medium text-indigo-600 hover:underline"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
