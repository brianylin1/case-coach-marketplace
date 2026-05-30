import { focusLabel } from "@/lib/constants";

export function FocusTag({ focusKey }: { focusKey: string }) {
  return (
    <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
      {focusLabel(focusKey)}
    </span>
  );
}
