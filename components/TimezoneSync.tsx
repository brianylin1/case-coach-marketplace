"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { TZ_COOKIE } from "@/lib/timezone";

// Detects the browser's IANA zone and stores it in a cookie so server
// components can render times in the viewer's local zone. Refreshes once when
// the detected zone differs from what the server last used. Renders nothing and
// writes no account data — a display preference only.
export function TimezoneSync() {
  const router = useRouter();
  useEffect(() => {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz) return;
    const current = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${TZ_COOKIE}=`))
      ?.split("=")[1];
    if (current === tz) return;
    document.cookie = `${TZ_COOKIE}=${tz}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }, [router]);
  return null;
}
