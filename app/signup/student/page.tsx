import Link from "next/link";
import type { Metadata } from "next";
import { StudentSignupForm, type StudentFormValues } from "@/components/StudentSignupForm";
import { getCurrentUser } from "@/lib/session";
import { parseList } from "@/lib/format";
import { cardClass } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Sign up as a student — CaseCoach",
};

export default async function StudentSignupPage() {
  const user = await getCurrentUser();
  // A logged-in student edits their existing preferences (prefilled); anyone
  // else gets the normal signup flow.
  const student = user?.role === "student" ? user.student : null;
  const editing = Boolean(student);

  const initialValues: Partial<StudentFormValues> | undefined = student
    ? {
        name: student.name,
        email: student.email,
        timeline: student.timeline ?? "",
        goal: student.goal ?? "",
        targetFirms: parseList(student.targetFirms),
        focusAreas: parseList(student.focusAreas),
      }
    : undefined;

  const heading = editing ? "Update your preferences" : "Find your case coach";
  const subtitle = editing
    ? "We'll use this information to help surface relevant coaches."
    : "Create a free account — about a minute — then browse coaches right away. No password required.";

  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{heading}</h1>
        <p className="mt-2 text-slate-600">{subtitle}</p>
      </div>
      <div className={`${cardClass} mt-8 p-6 sm:p-8`}>
        <StudentSignupForm initialValues={initialValues} editing={editing} />
      </div>
      {!editing && (
        <div className="mt-6 space-y-1 text-center text-sm text-slate-500">
          <p>
            Are you an MBB consultant?{" "}
            <Link
              href="/signup/coach"
              className="font-medium text-indigo-600 hover:underline"
            >
              Become a coach
            </Link>
          </p>
          <p>
            Already have an account?{" "}
            <Link href="/login" className="font-medium text-indigo-600 hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      )}
    </div>
  );
}
