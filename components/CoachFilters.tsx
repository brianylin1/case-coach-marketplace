"use client";

import { useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { FIRMS, FOCUS_AREAS } from "@/lib/constants";
import { inputClass } from "@/lib/ui";

const SORTS = [
  { value: "recommended", label: "Recommended" },
  { value: "rate-asc", label: "Lowest rate" },
  { value: "rate-desc", label: "Highest rate" },
  { value: "experience", label: "Most experienced" },
];

export function CoachFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const firm = searchParams.get("firm") ?? "";
  const focus = searchParams.get("focus") ?? "";
  const sort = searchParams.get("sort") ?? "recommended";
  const q = searchParams.get("q") ?? "";

  const [query, setQuery] = useState(q);

  function update(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(next)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    router.push(params.toString() ? `${pathname}?${params}` : pathname);
  }

  const hasFilters = Boolean(firm || focus || q || (sort && sort !== "recommended"));

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          update({ q: query });
        }}
        className="relative min-w-[220px] flex-1"
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name, firm, or keyword…"
          className={`${inputClass} pl-9`}
          aria-label="Search coaches"
        />
      </form>

      <select
        value={firm}
        onChange={(e) => update({ firm: e.target.value })}
        className={`${inputClass} lg:w-44`}
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
        className={`${inputClass} lg:w-56`}
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
        value={sort}
        onChange={(e) => update({ sort: e.target.value })}
        className={`${inputClass} lg:w-48`}
        aria-label="Sort coaches"
      >
        {SORTS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>

      {hasFilters && (
        <button
          type="button"
          onClick={() => {
            setQuery("");
            router.push(pathname);
          }}
          className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          <X className="size-4" />
          Clear
        </button>
      )}
    </div>
  );
}
