import { CheckCircle2, Clock, XCircle } from "lucide-react";

const MAP = {
  PENDING: {
    label: "Pending",
    cls: "bg-amber-50 text-amber-700 ring-amber-600/20",
    Icon: Clock,
  },
  ACCEPTED: {
    label: "Accepted",
    cls: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    Icon: CheckCircle2,
  },
  DECLINED: {
    label: "Declined",
    cls: "bg-slate-100 text-slate-600 ring-slate-500/20",
    Icon: XCircle,
  },
  CONFIRMED: {
    label: "Confirmed",
    cls: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
    Icon: CheckCircle2,
  },
  CANCELLED: {
    label: "Cancelled",
    cls: "bg-slate-100 text-slate-600 ring-slate-500/20",
    Icon: XCircle,
  },
} as const;

export function StatusBadge({ status }: { status: string }) {
  const entry = MAP[status as keyof typeof MAP] ?? MAP.CONFIRMED;
  const { Icon } = entry;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${entry.cls}`}
    >
      <Icon className="size-3.5" />
      {entry.label}
    </span>
  );
}
