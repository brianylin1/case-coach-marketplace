"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { btnGhost } from "@/lib/ui";

// Persistent entry point to the coach's Stripe-hosted Express dashboard. Shown
// whenever a coach has a Stripe account (any payout status), so they can always
// manage payouts, update bank/tax details, complete verification, or recover a
// restricted account — all on Stripe, no custom forms here. POSTs to the
// management endpoint (/api/stripe/login-link), which is separate from onboarding.
export function ManagePayoutsButton() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function open() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/login-link", { method: "POST" });
      // Parse defensively so an empty/non-JSON body never surfaces as the
      // opaque "Unexpected end of JSON input".
      const text = await res.text();
      let data: { url?: string; error?: string } = {};
      if (text) {
        try {
          data = JSON.parse(text) as { url?: string; error?: string };
        } catch {
          // leave data empty; fall through to a status-based message
        }
      }
      if (!res.ok || !data.url) {
        throw new Error(
          data.error ?? `Could not open Stripe (HTTP ${res.status}).`,
        );
      }
      // Login links are single-use and short-lived; a same-tab redirect is the
      // most reliable hand-off (no popup blockers).
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <div className="mt-1.5">
      <button type="button" onClick={open} disabled={loading} className={`${btnGhost} -ml-3`}>
        <ExternalLink className="size-4" />
        {loading ? "Opening…" : "Manage payouts on Stripe"}
      </button>
      <p className="mt-0.5 text-xs text-slate-400">
        Update your bank, tax info, or verification — handled securely by Stripe.
      </p>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
