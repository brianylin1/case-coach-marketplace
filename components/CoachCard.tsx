import Link from "next/link";
import { ExternalLink, Users } from "lucide-react";
import { Avatar } from "./Avatar";
import { FirmBadge } from "./FirmBadge";
import { bestForPhrase, casesCoachedLabel } from "@/lib/constants";
import { formatRate, parseList } from "@/lib/format";
import { cardClass } from "@/lib/ui";

type CoachLike = {
  id: number;
  name: string;
  firm: string;
  title: string;
  yearsAtFirm: number;
  focusAreas: string;
  hourlyRate: number;
  bestFor: string | null;
  firmStatus: string | null;
  casesCoached: string | null;
  photoUrl: string | null;
  linkedinUrl: string | null;
};

// The whole card navigates to the coach page via a stretched overlay link, so
// the LinkedIn link can sit on top as a separate, valid anchor (no nested <a>).
export function CoachCard({ coach }: { coach: CoachLike }) {
  const best = bestForPhrase(coach.bestFor, parseList(coach.focusAreas));
  const cases = casesCoachedLabel(coach.casesCoached);
  const statusWord =
    coach.firmStatus === "current"
      ? "Current"
      : coach.firmStatus === "former"
        ? "Former"
        : null;
  return (
    <div
      className={`${cardClass} group relative flex flex-col gap-3 p-5 transition hover:-translate-y-0.5 hover:shadow-md`}
    >
      <div className="flex items-start gap-3">
        <Avatar name={coach.name} src={coach.photoUrl} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <h3 className="truncate font-semibold text-slate-900">{coach.name}</h3>
            <FirmBadge firm={coach.firm} />
          </div>
          <p className="text-sm text-slate-500">
            {statusWord ? `${statusWord} ` : ""}
            {coach.title} · {coach.yearsAtFirm} yr{coach.yearsAtFirm === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {best && (
        <p className="text-xs font-semibold text-indigo-600">Best for {best}</p>
      )}

      {cases && (
        <p className="inline-flex items-center gap-1.5 text-xs text-slate-500">
          <Users className="size-3.5 text-slate-400" />
          {cases}
        </p>
      )}

      <div className="mt-auto flex items-center justify-between border-t border-slate-100 pt-3">
        <span className="text-sm font-semibold text-slate-900">
          {formatRate(coach.hourlyRate)}
        </span>
        <span className="text-sm font-medium text-indigo-600 group-hover:underline">
          View times →
        </span>
      </div>

      {coach.linkedinUrl && (
        <a
          href={coach.linkedinUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${coach.name} on LinkedIn`}
          className="relative z-10 inline-flex w-fit items-center gap-1 text-xs font-medium text-slate-400 hover:text-indigo-600"
        >
          <ExternalLink className="size-3.5" />
          LinkedIn
        </a>
      )}

      {/* Stretched overlay turns the whole card into the profile link. */}
      <Link
        href={`/coaches/${coach.id}`}
        aria-label={`View ${coach.name}'s profile and times`}
        className="absolute inset-0 z-0"
      />
    </div>
  );
}
