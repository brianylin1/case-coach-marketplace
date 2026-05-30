import { firmStyle } from "@/lib/constants";

export function FirmBadge({ firm }: { firm: string }) {
  const style = firmStyle(firm);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${style.badge}`}
    >
      <span className={`size-1.5 rounded-full ${style.dot}`} />
      {firm}
    </span>
  );
}
