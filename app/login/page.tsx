import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { LoginForm } from "@/components/LoginForm";
import { getSession } from "@/lib/session";
import { cardClass } from "@/lib/ui";

export const metadata: Metadata = {
  title: "Sign in · Down to Case",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string }>;
}) {
  if (await getSession()) redirect("/dashboard");

  const { role } = await searchParams;
  const defaultRole = role === "coach" ? "coach" : "student";

  return (
    <div className="mx-auto max-w-md px-4 py-16 sm:px-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          Welcome back
        </h1>
        <p className="mt-2 text-slate-600">
          Sign in with your email — no password needed.
        </p>
      </div>
      <div className={`${cardClass} mt-8 p-6 sm:p-8`}>
        <LoginForm defaultRole={defaultRole} />
      </div>
    </div>
  );
}
