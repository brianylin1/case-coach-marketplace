// Shared domain constants. Safe to import from both client and server components.

export const FIRMS = ["McKinsey", "Bain", "BCG", "Other"] as const;
export type Firm = (typeof FIRMS)[number];

export function isFirm(value: string): value is Firm {
  return (FIRMS as readonly string[]).includes(value);
}

// Tailwind classes per firm, loosely echoing each firm's brand color.
// `short` is a compact monogram used in dense UI (calendar cells). These are
// plain text abbreviations, not trademarked logos.
export const FIRM_STYLES: Record<Firm, { short: string; badge: string; dot: string }> = {
  McKinsey: { short: "McK", badge: "bg-blue-50 text-blue-700 ring-blue-600/20", dot: "bg-blue-600" },
  Bain: { short: "Bain", badge: "bg-red-50 text-red-700 ring-red-600/20", dot: "bg-red-600" },
  BCG: { short: "BCG", badge: "bg-emerald-50 text-emerald-700 ring-emerald-600/20", dot: "bg-emerald-600" },
  Other: { short: "Other", badge: "bg-slate-100 text-slate-700 ring-slate-600/20", dot: "bg-slate-500" },
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
