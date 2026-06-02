"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarDays, List } from "lucide-react";

export function ViewToggle({ view }: { view: "calendar" | "list" }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  function set(next: "calendar" | "list") {
    const params = new URLSearchParams(sp.toString());
    if (next === "calendar") params.delete("view");
    else params.set("view", next);
    router.push(params.toString() ? `${pathname}?${params}` : pathname);
  }

  const base =
    "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition";

  return (
    <div className="inline-flex rounded-lg border border-slate-300 bg-white p-0.5">
      <button
        type="button"
        onClick={() => set("calendar")}
        aria-pressed={view === "calendar"}
        className={`${base} ${view === "calendar" ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
      >
        <CalendarDays className="size-4" />
        Calendar
      </button>
      <button
        type="button"
        onClick={() => set("list")}
        aria-pressed={view === "list"}
        className={`${base} ${view === "list" ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}
      >
        <List className="size-4" />
        List
      </button>
    </div>
  );
}
