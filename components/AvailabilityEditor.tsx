"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CalendarClock, Plus, Trash2 } from "lucide-react";
import { MAX_OPEN_SLOTS } from "@/lib/constants";
import { btnPrimary, cardClass, inputClass } from "@/lib/ui";

type OpenSlot = { id: number; dateLabel: string; timeLabel: string };

export function AvailabilityEditor({ openSlots }: { openSlots: OpenSlot[] }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const full = openSlots.length >= MAX_OPEN_SLOTS;

  async function add(event: React.FormEvent) {
    event.preventDefault();
    if (!value) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ startTime: new Date(value).toISOString() }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not add that slot.");
        return;
      }
      setValue("");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function remove(id: number) {
    const res = await fetch(`/api/slots/${id}`, { method: "DELETE" });
    if (res.ok) router.refresh();
  }

  return (
    <div className={`${cardClass} p-5`}>
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-900">Your availability</h2>
        <span className="text-xs font-medium text-slate-400">
          {openSlots.length} / {MAX_OPEN_SLOTS} open
        </span>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Add up to {MAX_OPEN_SLOTS} bookable slots. Students book these instantly —
        no back-and-forth.
      </p>

      <ul className="mt-4 space-y-2">
        {openSlots.length === 0 && (
          <li className="rounded-lg border border-dashed border-slate-300 px-3 py-4 text-center text-sm text-slate-400">
            No open slots yet — add your first below.
          </li>
        )}
        {openSlots.map((s) => (
          <li
            key={s.id}
            className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2"
          >
            <span className="flex items-center gap-2 text-sm text-slate-700">
              <CalendarClock className="size-4 text-slate-400" />
              {s.dateLabel} · {s.timeLabel}
            </span>
            <button
              onClick={() => remove(s.id)}
              aria-label="Remove slot"
              className="text-slate-400 transition hover:text-red-600"
            >
              <Trash2 className="size-4" />
            </button>
          </li>
        ))}
      </ul>

      <form onSubmit={add} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          type="datetime-local"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={full}
          className={`${inputClass} sm:flex-1`}
          aria-label="New slot date and time"
        />
        <button type="submit" disabled={full || loading || !value} className={btnPrimary}>
          <Plus className="size-4" />
          {loading ? "Adding…" : "Add slot"}
        </button>
      </form>

      {full && (
        <p className="mt-2 text-xs text-amber-600">
          You&apos;ve reached {MAX_OPEN_SLOTS} open slots. Remove one to add another.
        </p>
      )}
      {error && (
        <p className="mt-2 flex items-center gap-2 text-sm text-red-700">
          <AlertCircle className="size-4 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
