"use client";

import { useState } from "react";

// Kicks off Stripe Express onboarding: POSTs to /api/stripe/connect and
// redirects to the returned hosted Account Link.
export function ConnectPayoutsButton({
  className,
  label = "Connect payouts",
}: {
  className?: string;
  label?: string;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/stripe/connect", { method: "POST" });
      // Parse defensively: an empty/non-JSON body must not surface as the
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
          data.error ?? `Could not start Stripe onboarding (HTTP ${res.status}).`,
        );
      }
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button type="button" onClick={start} disabled={loading} className={className}>
        {loading ? "Starting…" : label}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
