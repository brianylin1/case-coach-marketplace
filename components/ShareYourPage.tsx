"use client";

import { useState } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  Link2,
  MessageSquare,
  Share2,
  Zap,
} from "lucide-react";
import { btnGhost, btnSecondary, cardClass } from "@/lib/ui";

// Coach-facing "Share your booking page" card, shown on the dashboard only once
// a coach is bookable (gated by the caller). It hands the coach their public
// link plus ready-to-paste messages so sharing is a one-tap action. This is an
// experiment to validate whether coaches will actively distribute their page to
// drive their own demand — no tracking is added. The absolute `bookingUrl` is
// resolved server-side and passed in, so there's no client-only URL math here.
export function ShareYourPage({
  bookingUrl,
  firm,
  title,
  firmStatus,
}: {
  bookingUrl: string;
  firm: string;
  title: string;
  firmStatus: string | null;
}) {
  const display = bookingUrl.replace(/^https?:\/\//, "");

  const [copied, setCopied] = useState<string | null>(null);
  async function copy(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 2000);
    } catch {
      // Clipboard unavailable (e.g. a non-secure context) — no-op.
    }
  }

  // "former McKinsey Engagement Manager" — drop the status word when it's unset,
  // the same graceful fallback the public profile's credibility line uses.
  const role = `${firmStatus ? `${firmStatus} ` : ""}${firm} ${title}`;

  const dmText = `Happy to help! I run mock case interviews here — pick any open time and it books instantly: ${bookingUrl}`;

  const linkedinText = `Helping people prep for consulting interviews has become one of my favorite parts of the week, so I'm making it easier to grab time with me.

I'm a ${role} and I run live 1:1 mock case interviews — you'll work a real case, then get direct, specific feedback on where you stand before the real thing.

Pick any open time and you're booked instantly 👉 ${bookingUrl}

Recruiting this cycle? Come get your reps in.`;

  return (
    <section className={`${cardClass} mb-6 p-5`}>
      <div className="flex items-center gap-2">
        <Share2 className="size-5 text-indigo-600" />
        <h2 className="font-semibold text-slate-900">Share your booking page</h2>
      </div>
      <p className="mt-1 text-sm text-slate-600">
        Most coaches get their first booking by sharing this page with someone
        who has already asked for help.
      </p>
      <p className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-slate-700">
        <Zap className="size-4 shrink-0 text-indigo-500" />
        Students can book you instantly and pay online.
      </p>

      {/* Booking link + copy */}
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2.5">
          <Link2 className="size-4 shrink-0 text-slate-400" />
          <span className="truncate text-sm text-slate-700">{display}</span>
        </div>
        <button
          type="button"
          onClick={() => copy(bookingUrl, "link")}
          className={`${btnSecondary} shrink-0`}
        >
          {copied === "link" ? (
            <>
              <Check className="size-4 text-emerald-600" /> Copied
            </>
          ) : (
            <>
              <Copy className="size-4" /> Copy link
            </>
          )}
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        <a href={bookingUrl} target="_blank" rel="noreferrer" className={btnGhost}>
          <ExternalLink className="size-4" /> Preview your page
        </a>
        <span className="text-xs text-slate-400">See exactly what students see.</span>
      </div>

      {/* Ready-to-paste messages */}
      <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row">
        <button
          type="button"
          onClick={() => copy(dmText, "dm")}
          className={btnSecondary}
        >
          {copied === "dm" ? (
            <>
              <Check className="size-4 text-emerald-600" /> Copied
            </>
          ) : (
            <>
              <MessageSquare className="size-4" /> Copy DM message
            </>
          )}
        </button>
        <button
          type="button"
          onClick={() => copy(linkedinText, "linkedin")}
          className={btnSecondary}
        >
          {copied === "linkedin" ? (
            <>
              <Check className="size-4 text-emerald-600" /> Copied
            </>
          ) : (
            <>
              <Share2 className="size-4" /> Copy LinkedIn post
            </>
          )}
        </button>
      </div>
    </section>
  );
}
