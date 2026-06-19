import { CalendarClock, ExternalLink, Target, Users } from "lucide-react";
import { Avatar } from "./Avatar";
import { FirmBadge } from "./FirmBadge";
import { FocusTag } from "./FocusTag";
import { bestForPhrase, casesCoachedLabel, firmStatusWord } from "@/lib/constants";
import { formatRate } from "@/lib/format";
import type { CoachView } from "@/lib/types";

// Presentational coach profile, reused in the session-browser modal and on the
// standalone coach page. No hooks, so it renders fine in both server and client
// trees. Every trust signal is optional — absent ones simply don't render.
export function CoachProfilePanel({ coach }: { coach: CoachView }) {
  // Drop tenure for people who haven't started (incoming offer holders sit at 0
  // years); show it only when it's a real, positive number.
  const years =
    coach.yearsAtFirm > 0
      ? ` · ${coach.yearsAtFirm} yr${coach.yearsAtFirm === 1 ? "" : "s"}`
      : "";
  // Claim "Incoming/Current/Former <Firm>" only when the coach stated it;
  // otherwise keep the neutral wording used before firmStatus existed. Never
  // inferred.
  const statusWord = firmStatusWord(coach.firmStatus);
  const credential =
    statusWord && coach.firm !== "Other"
      ? `${statusWord} ${coach.firm} ${coach.title}${years}`
      : `${coach.title}${years} at ${coach.firm}`;
  const bestFor = bestForPhrase(coach.bestFor, coach.focusKeys);
  const cases = casesCoachedLabel(coach.casesCoached);

  return (
    <div>
      <div className="flex items-start gap-4">
        <Avatar name={coach.name} size="lg" src={coach.photoUrl} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900">{coach.name}</h2>
            <FirmBadge firm={coach.firm} />
          </div>
          <p className="mt-0.5 text-sm text-slate-600">{credential}</p>
          {coach.linkedinUrl && (
            <a
              href={coach.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:underline"
            >
              <ExternalLink className="size-3.5" />
              LinkedIn
            </a>
          )}
          {coach.headline && (
            <p className="mt-2 font-medium text-slate-800">{coach.headline}</p>
          )}
        </div>
      </div>

      {(bestFor || cases) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {bestFor && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700">
              <Target className="size-4 shrink-0" />
              Best for {bestFor}
            </span>
          )}
          {cases && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700">
              <Users className="size-4 shrink-0 text-slate-400" />
              {cases}
            </span>
          )}
        </div>
      )}

      <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-slate-700">
        {coach.bio}
      </p>

      <div className="mt-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          Focus areas
        </h3>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {coach.focusKeys.map((key) => (
            <FocusTag key={key} focusKey={key} />
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-100 pt-4 text-sm text-slate-600">
        <span>
          <span className="text-base font-semibold text-slate-900">
            {formatRate(coach.hourlyRate)}
          </span>{" "}
          <span className="text-slate-400">· 60-min sessions</span>
        </span>
        {coach.availability && (
          <span className="inline-flex items-center gap-1.5">
            <CalendarClock className="size-4 text-slate-400" />
            {coach.availability}
          </span>
        )}
      </div>
    </div>
  );
}
