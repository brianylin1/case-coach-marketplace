"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { btnPrimary, btnSecondary } from "@/lib/ui";

export function RequestActions({ requestId }: { requestId: number }) {
  const router = useRouter();
  const [loading, setLoading] = useState<"ACCEPTED" | "DECLINED" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function update(status: "ACCEPTED" | "DECLINED") {
    setLoading(status);
    setError(null);
    try {
      const res = await fetch(`/api/requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error ?? "Could not update.");
        setLoading(null);
        return;
      }
      router.refresh();
    } catch {
      setError("Network error.");
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <button
          onClick={() => update("DECLINED")}
          disabled={loading !== null}
          className={`${btnSecondary} px-3 py-2`}
        >
          <X className="size-4" />
          Decline
        </button>
        <button
          onClick={() => update("ACCEPTED")}
          disabled={loading !== null}
          className={`${btnPrimary} px-3 py-2`}
        >
          <Check className="size-4" />
          Accept
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
