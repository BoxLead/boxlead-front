export const DEFAULT_APP_PATH = "/app/inbox";
export const NEXT_PARAM = "next";

export function safeAppPath(value: unknown): string | null {
  if (typeof value !== "string" || !value.startsWith("/app") || value.includes("\\")) {
    return null;
  }
  try {
    const origin = window.location.origin;
    const url = new URL(value, origin);
    if (url.origin !== origin) return null;
    if (url.pathname !== "/app" && !url.pathname.startsWith("/app/")) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export function loginPathFor(path: string): string {
  const next = safeAppPath(path);
  return next ? `/login?${NEXT_PARAM}=${encodeURIComponent(next)}` : "/login";
}
