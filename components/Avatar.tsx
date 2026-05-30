import { initials } from "@/lib/format";

const COLORS = [
  "bg-indigo-100 text-indigo-700",
  "bg-emerald-100 text-emerald-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-sky-100 text-sky-700",
  "bg-violet-100 text-violet-700",
];

export function Avatar({
  name,
  size = "md",
}: {
  name: string;
  size?: "md" | "lg";
}) {
  const index =
    [...name].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % COLORS.length;
  const dimensions = size === "lg" ? "size-16 text-xl" : "size-11 text-sm";
  return (
    <span
      className={`inline-flex ${dimensions} shrink-0 items-center justify-center rounded-full font-semibold ${COLORS[index]}`}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
