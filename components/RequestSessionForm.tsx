"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle2, Send } from "lucide-react";
import { focusLabel } from "@/lib/constants";
import { btnPrimary, btnSecondary, inputClass, labelClass } from "@/lib/ui";

export function RequestSessionForm({
  coachId,
  coachName,
  focusKeys,
}: {
  coachId: number;
  coachName: string;
  focusKeys: string[];
}) {
  const [focusArea, setFocusArea] = useState(focusKeys[0] ?? "");
  const [message, setMessage] = useState("");
  const [proposedTimes, setProposedTimes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coachId, focusArea, message, proposedTimes }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not send your request.");
        return;
      }
      setDone(true);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center">
        <CheckCircle2 className="mx-auto size-8 text-emerald-600" />
        <h3 className="mt-2 font-semibold text-slate-900">Request sent!</h3>
        <p className="mt-1 text-sm text-slate-600">
          {coachName.split(" ")[0]} will get your request and can accept it from
          their dashboard. We&apos;ll keep you posted.
        </p>
        <Link href="/dashboard" className={`${btnSecondary} mt-4`}>
          Track it in your dashboard
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className={labelClass} htmlFor="focus">
          What do you want to work on?
        </label>
        <select
          id="focus"
          className={`${inputClass} mt-1.5`}
          value={focusArea}
          onChange={(e) => setFocusArea(e.target.value)}
          required
        >
          {focusKeys.map((key) => (
            <option key={key} value={key}>
              {focusLabel(key)}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass} htmlFor="message">
          Message
        </label>
        <textarea
          id="message"
          rows={4}
          className={`${inputClass} mt-1.5`}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={`Hi ${coachName.split(" ")[0]} — here's where I'm at and what I'd love help with…`}
          required
        />
      </div>

      <div>
        <label className={labelClass} htmlFor="times">
          When are you free? <span className="font-normal text-slate-400">(optional)</span>
        </label>
        <input
          id="times"
          className={`${inputClass} mt-1.5`}
          value={proposedTimes}
          onChange={(e) => setProposedTimes(e.target.value)}
          placeholder="Weeknights ET, or this Saturday"
        />
      </div>

      {error && (
        <p className="flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </p>
      )}

      <button type="submit" disabled={loading} className={`${btnPrimary} w-full`}>
        <Send className="size-4" />
        {loading ? "Sending…" : "Send request"}
      </button>
    </form>
  );
}
