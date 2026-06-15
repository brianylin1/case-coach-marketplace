"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AlertCircle, GraduationCap, Briefcase, KeyRound } from "lucide-react";
import { btnPrimary, inputClass, labelClass } from "@/lib/ui";

type Role = "student" | "coach";

// Keep in sync with MIN_PASSWORD_LENGTH in lib/password.ts (the server enforces
// it; this is just for friendlier client-side feedback).
const MIN_PASSWORD_LENGTH = 8;

export function LoginForm({ defaultRole = "student" }: { defaultRole?: Role }) {
  const router = useRouter();
  const [role, setRole] = useState<Role>(defaultRole);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  // "login" = verify an existing password; "claim" = an account with no
  // password yet (created before passwords existed) is choosing one.
  const [mode, setMode] = useState<"login" | "claim">("login");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function goToClaim() {
    setMode("claim");
    setError(null);
    setPassword("");
    setConfirm("");
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (mode === "claim") {
      if (password.length < MIN_PASSWORD_LENGTH) {
        setError(`Password must be at least ${MIN_PASSWORD_LENGTH} characters.`);
        return;
      }
      if (password !== confirm) {
        setError("Passwords don't match.");
        return;
      }
    }

    setLoading(true);
    try {
      const endpoint = mode === "claim" ? "/api/auth/set-password" : "/api/auth/login";
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });
      const data = await res.json();

      // An account with no password yet — switch to the "create a password" step.
      if (res.ok && data.needsPassword) {
        goToClaim();
        return;
      }
      if (!res.ok) {
        // If a claim raced another (password already set), drop back to login.
        if (mode === "claim" && res.status === 409) setMode("login");
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
              disabled={mode === "claim"}
              className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-medium transition disabled:opacity-60 ${
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
          className={`${inputClass} mt-1.5 ${mode === "claim" ? "cursor-not-allowed bg-slate-100 text-slate-500" : ""}`}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          required
          readOnly={mode === "claim"}
        />
      </div>

      {mode === "claim" && (
        <p className="flex items-start gap-2 rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-700">
          <KeyRound className="mt-0.5 size-4 shrink-0" />
          <span>
            This account doesn&apos;t have a password yet. Create one now to secure
            it — you&apos;ll use it to sign in from now on.
          </span>
        </p>
      )}

      <div>
        <label className={labelClass} htmlFor="login-password">
          {mode === "claim" ? "Create a password" : "Password"}
        </label>
        <input
          id="login-password"
          type="password"
          autoComplete={mode === "claim" ? "new-password" : "current-password"}
          className={`${inputClass} mt-1.5`}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={mode === "claim" ? `At least ${MIN_PASSWORD_LENGTH} characters` : "Your password"}
          required
          minLength={mode === "claim" ? MIN_PASSWORD_LENGTH : undefined}
        />
      </div>

      {mode === "claim" && (
        <div>
          <label className={labelClass} htmlFor="login-confirm">
            Confirm password
          </label>
          <input
            id="login-confirm"
            type="password"
            autoComplete="new-password"
            className={`${inputClass} mt-1.5`}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Re-enter your password"
            required
          />
        </div>
      )}

      {error && (
        <p className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </p>
      )}

      <button type="submit" disabled={loading} className={`${btnPrimary} w-full`}>
        {loading
          ? mode === "claim"
            ? "Saving…"
            : "Signing in…"
          : mode === "claim"
            ? "Set password & sign in"
            : "Sign in"}
      </button>

      {mode === "claim" ? (
        <button
          type="button"
          onClick={() => {
            setMode("login");
            setError(null);
          }}
          className="block w-full text-center text-sm font-medium text-indigo-600 hover:underline"
        >
          Back to sign in
        </button>
      ) : (
        <p className="text-center text-sm text-slate-500">
          New here?{" "}
          <Link
            href={role === "coach" ? "/signup/coach" : "/signup/student"}
            className="font-medium text-indigo-600 hover:underline"
          >
            Create a {role} account
          </Link>
        </p>
      )}
    </form>
  );
}
