// Reads the viewer's display timezone from the cookie set by TimezoneSync.
// Server-only — never import from a "use client" component.
import { cookies } from "next/headers";
import { TZ_COOKIE, isValidTimeZone } from "@/lib/timezone";

// The viewer's IANA zone for display. Falls back to UTC before detection lands
// (first paint) or if the cookie is missing/invalid. Display preference only.
export async function getViewerTimeZone(fallback = "UTC"): Promise<string> {
  const value = (await cookies()).get(TZ_COOKIE)?.value;
  return isValidTimeZone(value) ? value : fallback;
}
