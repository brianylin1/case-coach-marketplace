import { Clock, ExternalLink, Users, Zap } from "lucide-react";
import { Avatar } from "./Avatar";
import { FirmBadge } from "./FirmBadge";
import { bestForPhrase, casesCoachedLabel } from "@/lib/constants";
import { formatRate } from "@/lib/format";
import { btnPrimary, cardClass } from "@/lib/ui";
import type { SlotView } from "@/lib/types";

// A single bookable time slot. Leads with the time; coach details are secondary
// and the whole card opens the coach profile. "Book instantly" books directly.
export function SlotCard({
  slot,
  onOpen,
  onBook,
}: {
  slot: SlotView;
  onOpen: () => void;
  onBook: () => void;
}) {
  const c = slot.coach;
  const best = bestForPhrase(c.bestFor, c.focusKeys);
  const cases = casesCoachedLabel(c.casesCoached);
  const statusWord =
    c.firmStatus === "current" ? "Current " : c.firmStatus === "former" ? "Former " : "";
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onDoubleClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className={`${cardClass} flex cursor-pointer flex-col gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-md`}
    >
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5 text-lg font-bold text-slate-900">
          <Clock className="size-4 text-indigo-500" />
          {slot.timeLabel}
        </span>
        <span className="text-sm font-semibold text-slate-900">
          {formatRate(c.hourlyRate)}
        </span>
      </div>

      <div className="flex items-center gap-2.5">
        <Avatar name={c.name} src={c.photoUrl} />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-semibold text-slate-900">{c.name}</p>
            <FirmBadge firm={c.firm} />
          </div>
          <p className="truncate text-xs text-slate-500">
            {statusWord}
            {c.title} · {c.yearsAtFirm} yr{c.yearsAtFirm === 1 ? "" : "s"}
          </p>
        </div>
      </div>

      {best && (
        <p className="truncate text-xs font-medium text-indigo-600">Best for {best}</p>
      )}

      {(cases || c.linkedinUrl) && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
          {cases && (
            <span className="inline-flex items-center gap-1.5">
              <Users className="size-3.5 text-slate-400" />
              {cases}
            </span>
          )}
          {c.linkedinUrl && (
            <a
              href={c.linkedinUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1 font-medium text-slate-400 hover:text-indigo-600"
            >
              <ExternalLink className="size-3.5" />
              LinkedIn
            </a>
          )}
        </div>
      )}

      <button
        onClick={(e) => {
          e.stopPropagation();
          onBook();
        }}
        className={`${btnPrimary} mt-1 w-full`}
      >
        <Zap className="size-4" />
        Book instantly
      </button>
    </div>
  );
}
