"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { ChipSelect } from "./ChipSelect";
import { FIRMS, FOCUS_AREAS } from "@/lib/constants";
import { btnPrimary, inputClass, labelClass } from "@/lib/ui";

const FIRM_OPTIONS = FIRMS.map((f) => ({ key: f, label: f }));

export function StudentSignupForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [timeline, setTimeline] = useState("");
  const [goal, setGoal] = useState("");
  const [targetFirms, setTargetFirms] = useState<string[]>([]);
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
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
      router.push("/coaches");
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
            className={`${inputClass} mt-1.5`}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@university.edu"
            required
          />
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
        {loading ? "Creating your account…" : "Find my coach"}
      </button>
      <p className="text-center text-xs text-slate-400">
        No password needed — we&apos;ll recognize you by email next time.
      </p>
    </form>
  );
}
