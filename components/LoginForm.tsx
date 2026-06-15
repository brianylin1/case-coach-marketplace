"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, GraduationCap, Briefcase } from "lucide-react";
import { btnPrimary, inputClass, labelClass } from "@/lib/ui";

type Role = "student" | "coach";

export function LoginForm({ defaultRole = "student" }: { defaultRole?: Role }) {
  const router = useRouter();
  const [role, setRole] = useState<Role>(defaultRole);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not sign you in.");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const roles: { value: Role; label: string; Icon: typeof GraduationCap }[] = [
    { value: "student", label: "Student", Icon: GraduationCap },
    { value: "coach", label: "Coach", Icon: Briefcase },
  ];

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      <div>
        <label className={labelClass}>I&apos;m a…</label>
        <div className="mt-1.5 grid grid-cols-2 gap-2">
          {roles.map(({ value, label, Icon }) => (
            <button
              type="button"
              key={value}
              onClick={() => setRole(value)}
              aria-pressed={role === value}
              className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition ${
                role === value
                  ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                  : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"
              }`}
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className={labelClass} htmlFor="login-email">
          Email
        </label>
        <input
          id="login-email"
          type="email"
          autoComplete="email"
          className={`${inputClass} mt-1.5`}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          required
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="login-password">
          Password
        </label>
        <input
          id="login-password"
          type="password"
          autoComplete="current-password"
          className={`${inputClass} mt-1.5`}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Your password"
          required
        />
      </div>

      {error && (
        <p className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </p>
      )}

      <button type="submit" disabled={loading} className={`${btnPrimary} w-full`}>
        {loading ? "Signing in…" : "Sign in"}
      </button>

      <p className="text-center text-sm text-slate-500">
        New here?{" "}
        <Link
          href={role === "coach" ? "/signup/coach" : "/signup/student"}
          className="font-medium text-indigo-600 hover:underline"
        >
          Create a {role} account
        </Link>
      </p>
    </form>
  );
}
