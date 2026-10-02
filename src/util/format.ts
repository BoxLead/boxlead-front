const LOCALE = "es-AR";

export function formatShortDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString(LOCALE, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function truncate(str: string | null | undefined, max: number): string {
  if (!str) return "—";
  if (str.length <= max) return str;
  return `${str.slice(0, max - 1)}…`;
}
