"use client";

export function ChipSelect({
  options,
  selected,
  onToggle,
}: {
  options: readonly { key: string; label: string }[];
  selected: string[];
  onToggle: (key: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const active = selected.includes(option.key);
        return (
          <button
            type="button"
            key={option.key}
            onClick={() => onToggle(option.key)}
            aria-pressed={active}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium transition ${
              active
                ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
