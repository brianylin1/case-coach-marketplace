import Link from "next/link";
import { Avatar } from "./Avatar";
import { FirmBadge } from "./FirmBadge";
import { FocusTag } from "./FocusTag";
import { formatRate, parseList } from "@/lib/format";
import { cardClass } from "@/lib/ui";

type CoachLike = {
  id: number;
  name: string;
  firm: string;
  title: string;
  yearsAtFirm: number;
  headline: string | null;
  focusAreas: string;
  hourlyRate: number;
};

export function CoachCard({ coach }: { coach: CoachLike }) {
  const focus = parseList(coach.focusAreas);
  return (
    <Link
      href={`/coaches/${coach.id}`}
      className={`${cardClass} group flex flex-col gap-4 p-5 transition hover:-translate-y-0.5 hover:shadow-md`}
    >
      <div className="flex items-start gap-3">
        <Avatar name={coach.name} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate font-semibold text-slate-900">{coach.name}</h3>
            <FirmBadge firm={coach.firm} />
          </div>
          <p className="text-sm text-slate-500">
            {coach.title} · {coach.yearsAtFirm} yr{coach.yearsAtFirm === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {coach.headline && (
        <p className="line-clamp-2 text-sm text-slate-600">{coach.headline}</p>
      )}

      <div className="flex flex-wrap gap-1.5">
        {focus.slice(0, 3).map((f) => (
          <FocusTag key={f} focusKey={f} />
        ))}
        {focus.length > 3 && (
          <span className="self-center text-xs text-slate-400">
            +{focus.length - 3} more
          </span>
        )}
      </div>

      <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3">
        <span className="text-sm font-semibold text-slate-900">
          {formatRate(coach.hourlyRate)}
        </span>
        <span className="text-sm font-medium text-indigo-600 group-hover:underline">
          View times →
        </span>
      </div>
    </Link>
  );
}
