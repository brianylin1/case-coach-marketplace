import { CalendarClock, ExternalLink } from "lucide-react";
import { Avatar } from "./Avatar";
import { FirmBadge } from "./FirmBadge";
import { FocusTag } from "./FocusTag";
import { formatRate } from "@/lib/format";
import type { CoachView } from "@/lib/types";

// Presentational coach profile, reused in the session-browser modal and on the
// standalone coach page. No hooks, so it renders fine in both server and client
// trees.
export function CoachProfilePanel({ coach }: { coach: CoachView }) {
  return (
    <div>
      <div className="flex items-start gap-4">
        <Avatar name={coach.name} size="lg" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">{coach.name}</h2>
            <FirmBadge firm={coach.firm} />
          </div>
          <p className="mt-0.5 text-sm text-slate-600">
            {coach.title} · {coach.yearsAtFirm} yr{coach.yearsAtFirm === 1 ? "" : "s"} at{" "}
            {coach.firm}
          </p>
          {coach.headline && (
            <p className="mt-2 font-medium text-slate-800">{coach.headline}</p>
          )}
        </div>
      </div>

      <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-slate-700">
        {coach.bio}
      </p>

      <div className="mt-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Coaches on
        </h3>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {coach.focusKeys.map((key) => (
            <FocusTag key={key} focusKey={key} />
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-slate-600">
        <span className="text-base font-semibold text-slate-900">
          {formatRate(coach.hourlyRate)}
        </span>
        {coach.availability && (
          <span className="inline-flex items-center gap-1.5">
            <CalendarClock className="size-4 text-slate-400" />
            {coach.availability}
          </span>
        )}
        {coach.linkedinUrl && (
          <a
            href={coach.linkedinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 font-medium text-indigo-600 hover:underline"
          >
            <ExternalLink className="size-4" />
            LinkedIn
          </a>
        )}
      </div>
    </div>
  );
}
