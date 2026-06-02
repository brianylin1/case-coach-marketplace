"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Save } from "lucide-react";
import { gridHours, WEEKDAY_LABELS } from "@/lib/availability";
import { btnPrimary, cardClass } from "@/lib/ui";

const key = (weekday: number, hour: number) => `${weekday}-${hour}`;

function hourLabel(h: number): string {
  const period = h < 12 ? "AM" : "PM";
  const display = h % 12 === 0 ? 12 : h % 12;
  return `${display} ${period}`;
}

export function AvailabilityGrid({
  initialCellKeys,
}: {
  initialCellKeys: string[];
}) {
  const router = useRouter();
  const hours = gridHours();
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initialCellKeys),
  );
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Drag mode is decided by the first cell touched (When2Meet behaviour):
  // start on an empty cell -> paint; start on a green cell -> erase.
  const drag = useRef<{ active: boolean; mode: "add" | "remove" }>({
    active: false,
    mode: "add",
  });

  function apply(cellKey: string, mode: "add" | "remove") {
    setSelected((prev) => {
      const has = prev.has(cellKey);
      if ((mode === "add" && has) || (mode === "remove" && !has)) return prev;
      const next = new Set(prev);
      if (mode === "add") next.add(cellKey);
      else next.delete(cellKey);
      return next;
    });
    setDirty(true);
    setSaved(false);
  }

  function startDrag(cellKey: string) {
    const mode = selected.has(cellKey) ? "remove" : "add";
    drag.current = { active: true, mode };
    apply(cellKey, mode);
  }

  // Works for mouse and touch: find the cell under the pointer and paint it.
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current.active) return;
    const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
    const cellKey = el?.dataset?.cell;
    if (cellKey) apply(cellKey, drag.current.mode);
  }

  function endDrag() {
    drag.current.active = false;
  }

  async function save() {
    setSaving(true);
    try {
      const cells = [...selected].map((k) => {
        const [weekday, hour] = k.split("-").map(Number);
        return { weekday, hour };
      });
      const res = await fetch("/api/availability", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cells }),
      });
      if (res.ok) {
        setDirty(false);
        setSaved(true);
        router.refresh();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={`${cardClass} p-5`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-900">Your weekly availability</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Tap or drag to toggle. It repeats every week.
          </p>
        </div>
        <button
          onClick={save}
          disabled={!dirty || saving}
          className={`${btnPrimary} shrink-0`}
        >
          {saved && !dirty ? (
            <>
              <Check className="size-4" /> Saved
            </>
          ) : (
            <>
              <Save className="size-4" /> {saving ? "Saving…" : "Save"}
            </>
          )}
        </button>
      </div>

      <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded-sm bg-emerald-400" /> Available
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-3 rounded-sm border border-slate-300 bg-white" /> Unavailable
        </span>
        <span className="ml-auto font-medium text-slate-600">
          {selected.size} hr{selected.size === 1 ? "" : "s"}/week → ~{selected.size} session
          {selected.size === 1 ? "" : "s"}
        </span>
      </div>

      <div
        className="mt-4 overflow-x-auto"
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onPointerCancel={endDrag}
      >
        <div
          className="grid min-w-[320px] select-none gap-px"
          style={{ gridTemplateColumns: "3rem repeat(7, minmax(0, 1fr))" }}
        >
          <div />
          {WEEKDAY_LABELS.map((label) => (
            <div
              key={label}
              className="pb-1 text-center text-xs font-semibold text-slate-500"
            >
              {label}
            </div>
          ))}

          {hours.map((hour) => (
            <FragmentRow key={hour}>
              <div className="pr-2 text-right text-[11px] leading-8 text-slate-400">
                {hourLabel(hour)}
              </div>
              {WEEKDAY_LABELS.map((_, weekday) => {
                const cellKey = key(weekday, hour);
                const on = selected.has(cellKey);
                return (
                  <button
                    key={cellKey}
                    type="button"
                    data-cell={cellKey}
                    aria-pressed={on}
                    aria-label={`${WEEKDAY_LABELS[weekday]} ${hourLabel(hour)}`}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      startDrag(cellKey);
                    }}
                    className={`h-8 touch-none rounded-sm border transition-colors ${
                      on
                        ? "border-emerald-500 bg-emerald-400 hover:bg-emerald-500"
                        : "border-slate-200 bg-white hover:bg-slate-100"
                    }`}
                  />
                );
              })}
            </FragmentRow>
          ))}
        </div>
      </div>
    </div>
  );
}

// Grid is flat (display: grid), so each "row" is just its cells in order.
function FragmentRow({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
