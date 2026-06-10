"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { ChipSelect } from "./ChipSelect";
import { FIRMS, FOCUS_AREAS } from "@/lib/constants";
import { btnPrimary, inputClass, labelClass } from "@/lib/ui";

const FIRM_OPTIONS = FIRMS.map((f) => ({ key: f, label: f }));

export type StudentFormValues = {
  name: string;
  email: string;
  timeline: string;
  goal: string;
  targetFirms: string[];
  focusAreas: string[];
};

export function StudentSignupForm({
  initialValues,
  editing = false,
}: {
  initialValues?: Partial<StudentFormValues>;
  editing?: boolean;
}) {
  const router = useRouter();
  const iv = initialValues ?? {};
  const [name, setName] = useState(iv.name ?? "");
  const [email, setEmail] = useState(iv.email ?? "");
  const [timeline, setTimeline] = useState(iv.timeline ?? "");
  const [goal, setGoal] = useState(iv.goal ?? "");
  const [targetFirms, setTargetFirms] = useState<string[]>(iv.targetFirms ?? []);
  const [focusAreas, setFocusAreas] = useState<string[]>(iv.focusAreas ?? []);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function toggle(setter: typeof setTargetFirms) {
    return (key: string) =>
      setter((prev) =>
        prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
      );
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, timeline, goal, targetFirms, focusAreas }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        return;
      }
      // Editing returns to the dashboard; a fresh signup goes browsing.
      router.push(editing ? "/dashboard" : "/coaches");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass} htmlFor="name">
            Name
          </label>
          <input
            id="name"
            className={`${inputClass} mt-1.5`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jordan Lee"
            required
          />
        </div>
        <div>
          <label className={labelClass} htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            className={`${inputClass} mt-1.5 ${editing ? "cursor-not-allowed bg-slate-100 text-slate-500" : ""}`}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@university.edu"
            required
            readOnly={editing}
          />
          {editing && (
            <p className="mt-1 text-xs text-slate-400">Email can&apos;t be changed.</p>
          )}
        </div>
      </div>

      <div>
        <label className={labelClass}>Which firms are you targeting?</label>
        <p className="mb-2 mt-1 text-sm text-slate-500">Optional — pick any that apply.</p>
        <ChipSelect options={FIRM_OPTIONS} selected={targetFirms} onToggle={toggle(setTargetFirms)} />
      </div>

      <div>
        <label className={labelClass}>What do you want to work on?</label>
        <p className="mb-2 mt-1 text-sm text-slate-500">We&apos;ll use this to suggest coaches.</p>
        <ChipSelect options={FOCUS_AREAS} selected={focusAreas} onToggle={toggle(setFocusAreas)} />
      </div>

      <div>
        <label className={labelClass} htmlFor="timeline">
          Timeline <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <input
          id="timeline"
          className={`${inputClass} mt-1.5`}
          value={timeline}
          onChange={(e) => setTimeline(e.target.value)}
          placeholder="Interviewing in ~6 weeks"
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="goal">
          Anything else? <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <textarea
          id="goal"
          rows={3}
          className={`${inputClass} mt-1.5`}
          value={goal}
          onChange={(e) => setGoal(e.target.value)}
          placeholder="e.g. First-time case taker, my structures feel generic and I want to sound more like a consultant."
        />
      </div>

      {error && (
        <p className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </p>
      )}

      <button type="submit" disabled={loading} className={`${btnPrimary} w-full`}>
        {loading
          ? editing
            ? "Saving…"
            : "Creating your account…"
          : editing
            ? "Save changes"
            : "Find my coach"}
      </button>
      {!editing && (
        <p className="text-center text-xs text-slate-400">
          No password needed — we&apos;ll recognize you by email next time.
        </p>
      )}
    </form>
  );
}
