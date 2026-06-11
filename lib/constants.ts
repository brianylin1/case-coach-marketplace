// Shared domain constants. Safe to import from both client and server components.

export const FIRMS = ["McKinsey", "Bain", "BCG", "Other"] as const;
export type Firm = (typeof FIRMS)[number];

export function isFirm(value: string): value is Firm {
  return (FIRMS as readonly string[]).includes(value);
}

// Tailwind classes per firm, loosely echoing each firm's brand color.
// `short` is a compact monogram; `text` is a low-emphasis text color for dense
// UI (calendar cells). These are plain text abbreviations, not logos.
export const FIRM_STYLES: Record<
  Firm,
  { short: string; text: string; badge: string; dot: string }
> = {
  McKinsey: { short: "McK", text: "text-blue-600", badge: "bg-blue-50 text-blue-700 ring-blue-600/20", dot: "bg-blue-600" },
  Bain: { short: "Bain", text: "text-red-600", badge: "bg-red-50 text-red-700 ring-red-600/20", dot: "bg-red-600" },
  BCG: { short: "BCG", text: "text-emerald-600", badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", dot: "bg-emerald-600" },
  Other: { short: "Other", text: "text-slate-500", badge: "bg-slate-100 text-slate-700 ring-slate-600/20", dot: "bg-slate-500" },
};

export function firmStyle(firm: string) {
  return isFirm(firm) ? FIRM_STYLES[firm] : FIRM_STYLES.Other;
}

export const FOCUS_AREAS = [
  { key: "structuring", label: "Case Structuring & Frameworks" },
  { key: "market-sizing", label: "Market Sizing & Estimation" },
  { key: "profitability", label: "Profitability Cases" },
  { key: "market-entry", label: "Market Entry" },
  { key: "ma", label: "M&A / Due Diligence" },
  { key: "math", label: "Mental Math & Exhibits" },
  { key: "behavioral", label: "Behavioral / PEI" },
  { key: "mock", label: "Full Mock Interviews" },
  { key: "networking", label: "Resume & Networking" },
] as const;

export type FocusKey = (typeof FOCUS_AREAS)[number]["key"];

const FOCUS_LABELS: Record<string, string> = Object.fromEntries(
  FOCUS_AREAS.map((f) => [f.key, f.label]),
);

export function focusLabel(key: string): string {
  return FOCUS_LABELS[key] ?? key;
}

export function isFocusKey(value: string): boolean {
  return value in FOCUS_LABELS;
}

// ----- Coach trust / positioning ------------------------------------------

// Curated "Best for …" positioning a coach picks at signup. Single-select on
// purpose: one sharp line students can compare across coaches. Labels are
// lowercase phrases so they read mid-sentence after "Best for".
export const BEST_FOR = [
  { key: "first-rounds", label: "first-round casing fundamentals" },
  { key: "final-rounds", label: "final-round polish & partner-style pressure" },
  { key: "structuring-scratch", label: "structuring & frameworks from scratch" },
  { key: "quant", label: "market sizing & mental math" },
  { key: "pei", label: "PEI & behavioral storytelling" },
  { key: "get-interview", label: "resume, networking & getting the interview" },
] as const;

export type BestForKey = (typeof BEST_FOR)[number]["key"];

const BEST_FOR_LABELS: Record<string, string> = Object.fromEntries(
  BEST_FOR.map((b) => [b.key, b.label]),
);

export function isBestForKey(value: string): boolean {
  return value in BEST_FOR_LABELS;
}

// Fallback phrasing per focus area so every coach gets a "Best for …" line
// even before they pick one (focus areas are required at signup). Derived from
// the coach's own first focus selection — honest by construction.
const FOCUS_BEST_FOR: Record<string, string> = {
  structuring: "case structuring & frameworks",
  "market-sizing": "market sizing & estimation",
  profitability: "profitability cases",
  "market-entry": "market entry cases",
  ma: "M&A & due-diligence cases",
  math: "mental math & exhibits",
  behavioral: "behavioral / PEI prep",
  mock: "full mock interviews",
  networking: "resume & networking",
};

// The coach's authored positioning when set, else derived from their first
// recognizable focus area. Null only if a coach has no known focus keys.
export function bestForPhrase(
  bestFor: string | null | undefined,
  focusKeys: string[],
): string | null {
  if (bestFor && BEST_FOR_LABELS[bestFor]) return BEST_FOR_LABELS[bestFor];
  for (const key of focusKeys) {
    if (FOCUS_BEST_FOR[key]) return FOCUS_BEST_FOR[key];
  }
  return null;
}

// One-line, student-friendly description per focus area. Describes the skill,
// never the coach's performance, so profiles can't overclaim.
const FOCUS_DESCRIPTIONS: Record<string, string> = {
  structuring: "issue trees and frameworks that hold up under pressure",
  "market-sizing": "sizing logic and assumptions you can defend",
  profitability: "diagnosing revenue and margin problems quickly",
  "market-entry": "clear go/no-go logic for new markets",
  ma: "deal logic, synergies, and diligence-style thinking",
  math: "fast, accurate quant and exhibit reads",
  behavioral: "structured, memorable PEI and fit stories",
  mock: "end-to-end reps under realistic interview conditions",
  networking: "a resume and outreach approach that gets interviews",
};

export function focusDescription(key: string): string | null {
  return FOCUS_DESCRIPTIONS[key] ?? null;
}

// How a coach runs sessions (multi-select at signup). Blurbs are lowercase
// fragments rendered after an em dash.
export const SESSION_STYLES = [
  { key: "live-case", label: "Live case practice", blurb: "work cases together with feedback as you go" },
  { key: "drills", label: "Targeted drills", blurb: "focused reps on math, structuring, or exhibits" },
  { key: "full-mock", label: "Full mock interviews", blurb: "a realistic end-to-end interview, then a debrief" },
  { key: "frameworks", label: "Framework & structure coaching", blurb: "build structures that hold up under pressure" },
  { key: "pei-stories", label: "Behavioral / PEI coaching", blurb: "shape and stress-test your story bank" },
  { key: "resume-review", label: "Resume & networking review", blurb: "sharpen the materials and outreach that get interviews" },
] as const;

export type SessionStyleKey = (typeof SESSION_STYLES)[number]["key"];

const SESSION_STYLE_BY_KEY: Record<string, { label: string; blurb: string }> =
  Object.fromEntries(SESSION_STYLES.map((s) => [s.key, { label: s.label, blurb: s.blurb }]));

export function isSessionStyleKey(value: string): boolean {
  return value in SESSION_STYLE_BY_KEY;
}

export function sessionStyleLabel(key: string): string {
  return SESSION_STYLE_BY_KEY[key]?.label ?? key;
}

export function sessionStyleBlurb(key: string): string | null {
  return SESSION_STYLE_BY_KEY[key]?.blurb ?? null;
}

// Whether the coach is currently at `firm` or an alum. Self-reported — same
// trust basis as firm/title — and rendered as the coach's claim, never as
// "verified". Unset means we show the neutral wording used before this field.
export const FIRM_STATUSES = [
  { key: "current", label: "Current" },
  { key: "former", label: "Former" },
] as const;

export function isFirmStatus(value: string): value is "current" | "former" {
  return value === "current" || value === "former";
}

// Price filter buckets for the session browser. min/max are inclusive USD
// bounds on a coach's hourly rate; null means unbounded.
export const PRICE_BUCKETS = [
  { key: "any", label: "Any price", min: null, max: null },
  { key: "probono", label: "Pro bono", min: 0, max: 0 },
  { key: "lt100", label: "Under $100", min: 1, max: 99 },
  { key: "100to150", label: "$100–150", min: 100, max: 150 },
  { key: "gt150", label: "$150+", min: 151, max: null },
] as const;

export type PriceBucketKey = (typeof PRICE_BUCKETS)[number]["key"];

export function priceBucket(key: string | undefined) {
  return PRICE_BUCKETS.find((b) => b.key === key) ?? PRICE_BUCKETS[0];
}

// Coaches provide their own meeting room; this is the platform it runs on.
export const MEETING_PLATFORMS = [
  { key: "teams", label: "Microsoft Teams" },
  { key: "zoom", label: "Zoom" },
  { key: "meet", label: "Google Meet" },
  { key: "other", label: "Other" },
] as const;

export type MeetingPlatformKey = (typeof MEETING_PLATFORMS)[number]["key"];

const MEETING_PLATFORM_LABELS: Record<string, string> = Object.fromEntries(
  MEETING_PLATFORMS.map((p) => [p.key, p.label]),
);

export function isMeetingPlatform(value: string): boolean {
  return value in MEETING_PLATFORM_LABELS;
}

export function meetingPlatformLabel(key: string | null | undefined): string {
  return (key && MEETING_PLATFORM_LABELS[key]) || "Video call";
}

// A human-friendly "location" for calendar entries: the named platform when we
// recognize it, else a generic "Video call". Never the raw join URL — that
// belongs in the description, not a LOCATION field (which clients treat as a
// physical place).
export function meetingLocationLabel(platform: string | null | undefined): string {
  return platform === "teams" || platform === "zoom" || platform === "meet"
    ? meetingPlatformLabel(platform)
    : "Video call";
}

// Product brand (display name). Currently used in booking emails + calendar
// invites; the rest of the app/site is intentionally not rebranded yet.
export const BRAND = "Down to Case";

// Support contact surfaced in booking emails and calendar invites.
export const SUPPORT_EMAIL = "support@downtocase.com";
