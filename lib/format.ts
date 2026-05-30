// Helpers for the JSON-string list columns and display formatting.
// Safe to import from both client and server components.

export function parseList(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const value = JSON.parse(json);
    return Array.isArray(value) ? value.map((v) => String(v)) : [];
  } catch {
    return [];
  }
}

export function serializeList(values: string[]): string {
  return JSON.stringify([...new Set(values.map((v) => v.trim()).filter(Boolean))]);
}

export function formatRate(rate: number): string {
  return rate <= 0 ? "Pro bono" : `$${rate}/hr`;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(date).toLocaleDateString();
}
