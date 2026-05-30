"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { FIRMS, FOCUS_AREAS, PRICE_BUCKETS } from "@/lib/constants";
import { selectClass } from "@/lib/ui";

export function SessionFilters({
  days,
}: {
  days: { dayKey: string; short: string; sub: string }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const date = sp.get("date") ?? "";
  const firm = sp.get("firm") ?? "";
  const focus = sp.get("focus") ?? "";
  const price = sp.get("price") ?? "";

  function update(next: Record<string, string>) {
    const params = new URLSearchParams(sp.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    router.push(params.toString() ? `${pathname}?${params}` : pathname);
  }

  const hasFilters = Boolean(date || firm || focus || price);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-1">
        <DayChip active={date === ""} onClick={() => update({ date: "" })} short="Any" sub="day" />
        {days.map((d) => (
          <DayChip
            key={d.dayKey}
            active={date === d.dayKey}
            onClick={() => update({ date: d.dayKey })}
            short={d.short}
            sub={d.sub}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={firm}
          onChange={(e) => update({ firm: e.target.value })}
          className={selectClass}
          aria-label="Filter by firm"
        >
          <option value="">All firms</option>
          {FIRMS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
        <select
          value={focus}
          onChange={(e) => update({ focus: e.target.value })}
          className={selectClass}
          aria-label="Filter by focus area"
        >
          <option value="">All focus areas</option>
          {FOCUS_AREAS.map((f) => (
            <option key={f.key} value={f.key}>
              {f.label}
            </option>
          ))}
        </select>
        <select
          value={price}
          onChange={(e) => update({ price: e.target.value })}
          className={selectClass}
          aria-label="Filter by price"
        >
          {PRICE_BUCKETS.map((b) => (
            <option key={b.key} value={b.key === "any" ? "" : b.key}>
              {b.label}
            </option>
          ))}
        </select>
        {hasFilters && (
          <button
            type="button"
            onClick={() => router.push(pathname)}
            className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900"
          >
            <X className="size-4" />
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

function DayChip({
  active,
  onClick,
  short,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  short: string;
  sub: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-w-[68px] shrink-0 flex-col items-center rounded-xl border px-3 py-2 text-center transition ${
        active
          ? "border-indigo-600 bg-indigo-600 text-white"
          : "border-slate-300 bg-white text-slate-700 hover:border-slate-400"
      }`}
    >
      <span className="text-sm font-semibold">{short}</span>
      <span className={`text-xs ${active ? "text-indigo-100" : "text-slate-400"}`}>
        {sub}
      </span>
    </button>
  );
}
