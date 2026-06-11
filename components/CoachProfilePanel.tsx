import { CalendarClock, Check, ExternalLink, Target } from "lucide-react";
import { Avatar } from "./Avatar";
import { FirmBadge } from "./FirmBadge";
import {
  bestForPhrase,
  focusDescription,
  focusLabel,
  sessionStyleBlurb,
  sessionStyleLabel,
} from "@/lib/constants";
import { formatRate } from "@/lib/format";
import type { CoachView } from "@/lib/types";

// Presentational coach profile, reused in the session-browser modal and on the
// standalone coach page. No hooks, so it renders fine in both server and client
// trees.
export function CoachProfilePanel({ coach }: { coach: CoachView }) {
  const years = `${coach.yearsAtFirm} yr${coach.yearsAtFirm === 1 ? "" : "s"}`;
  // Credibility line: claim current/former only when the coach said so;
  // otherwise keep the neutral wording used before firmStatus existed.
  const statusWord =
    coach.firmStatus === "current"
      ? "Current"
      : coach.firmStatus === "former"
        ? "Former"
        : null;
  const credential =
    statusWord && coach.firm !== "Other"
      ? `${statusWord} ${coach.firm} ${coach.title} · ${years}`
      : `${coach.title} · ${years} at ${coach.firm}`;
  const bestFor = bestForPhrase(coach.bestFor, coach.focusKeys);

  return (
    <div>
      <div className="flex items-start gap-4">
        <Avatar name={coach.name} size="lg" />
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
              className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline"
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

      {bestFor && (
        <p className="mt-4 inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-700">
          <Target className="size-4 shrink-0" />
          Best for {bestFor}
        </p>
      )}

      <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-slate-700">
        {coach.bio}
      </p>

      <div className="mt-5">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
          What we&apos;ll work on
        </h3>
        <ul className="mt-2 space-y-1.5">
          {coach.focusKeys.map((key) => {
            const description = focusDescription(key);
            return (
              <li key={key} className="text-sm">
                <span className="font-medium text-slate-800">{focusLabel(key)}</span>
                {description && (
                  <span className="text-slate-500"> — {description}</span>
                )}
              </li>
            );
          })}
        </ul>
      </div>

      {coach.sessionStyleKeys.length > 0 && (
        <div className="mt-5">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            How sessions run
          </h3>
          <ul className="mt-2 space-y-1.5">
            {coach.sessionStyleKeys.map((key) => {
              const blurb = sessionStyleBlurb(key);
              return (
                <li key={key} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                  <span>
                    <span className="font-medium text-slate-800">
                      {sessionStyleLabel(key)}
                    </span>
                    {blurb && <span className="text-slate-500"> — {blurb}</span>}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-slate-100 pt-4 text-sm text-slate-600">
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
