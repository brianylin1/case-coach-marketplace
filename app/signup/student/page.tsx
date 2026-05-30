import Link from "next/link";
import type { Metadata } from "next";
import { StudentSignupForm } from "@/components/StudentSignupForm";
import { cardClass } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Sign up as a student — CaseCoach",
};

export default function StudentSignupPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-12 sm:px-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Find your case coach
        </h1>
        <p className="mt-2 text-slate-600">
          Create a free account — about a minute — then browse coaches right
          away. No password required.
        </p>
      </div>
      <div className={`${cardClass} mt-8 p-6 sm:p-8`}>
        <StudentSignupForm />
      </div>
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
    </div>
  );
}
