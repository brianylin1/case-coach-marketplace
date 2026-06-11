import Link from "next/link";
import type { Metadata } from "next";
import { CoachSignupForm, type CoachFormValues } from "@/components/CoachSignupForm";
import { getCurrentUser } from "@/lib/session";
import { getViewerTimeZone } from "@/lib/viewer-tz";
import { parseList } from "@/lib/format";
import { cardClass } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Coach with CaseCoach — for MBB consultants",
};

export default async function CoachSignupPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  const [{ section }, defaultTimezone, user] = await Promise.all([
    searchParams,
    getViewerTimeZone(),
    getCurrentUser(),
  ]);
  // A logged-in coach edits their existing profile (prefilled); anyone else signs up.
  const coach = user?.role === "coach" ? user.coach : null;
  const editing = Boolean(coach);

  const initialValues: Partial<CoachFormValues> | undefined = coach
    ? {
        name: coach.name,
        email: coach.email,
        firm: coach.firm,
        title: coach.title,
        yearsAtFirm: String(coach.yearsAtFirm),
        headline: coach.headline ?? "",
        bio: coach.bio,
        focusAreas: parseList(coach.focusAreas),
        hourlyRate: String(coach.hourlyRate),
        availability: coach.availability ?? "",
        linkedinUrl: coach.linkedinUrl ?? "",
        bestFor: coach.bestFor ?? "",
        casesCoached: coach.casesCoached ?? "",
        firmStatus: coach.firmStatus ?? "",
        photoUrl: coach.photoUrl ?? "",
        meetingPlatform: coach.meetingPlatform ?? "",
        meetingUrl: coach.meetingUrl ?? "",
        meetingId: coach.meetingId ?? "",
        meetingPasscode: coach.meetingPasscode ?? "",
        meetingInstructions: coach.meetingInstructions ?? "",
        timezone: coach.timezone,
      }
    : undefined;

  const heading = editing ? "Update your coaching profile" : "Coach the next generation";
  const subtitle = editing
    ? section === "meeting"
      ? "Add your default coaching room below — the rest of your profile is already filled in."
      : "Edit your details below. Changes save to your existing profile."
    : "Set up your profile, then accept the requests that fit your schedule. Charge what you like — or coach pro bono.";

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{heading}</h1>
        <p className="mt-2 text-slate-600">{subtitle}</p>
      </div>
      <div className={`${cardClass} mt-8 p-6 sm:p-8`}>
        <CoachSignupForm
          defaultTimezone={defaultTimezone}
          initialValues={initialValues}
          editing={editing}
          focusSection={section}
        />
      </div>
      {!editing && (
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
      )}
    </div>
  );
}
