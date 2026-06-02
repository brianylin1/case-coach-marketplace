"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { FIRMS, FOCUS_AREAS, PRICE_BUCKETS } from "@/lib/constants";
import { selectClass } from "@/lib/ui";

export function SessionFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

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

  function clear() {
    // Preserve the calendar/list view choice when clearing filters.
    const params = new URLSearchParams();
    const view = sp.get("view");
    if (view) params.set("view", view);
    router.push(params.toString() ? `${pathname}?${params}` : pathname);
  }

  const hasFilters = Boolean(firm || focus || price);

  return (
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
          onClick={clear}
          className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          <X className="size-4" />
          Clear
        </button>
      )}
    </div>
  );
}
