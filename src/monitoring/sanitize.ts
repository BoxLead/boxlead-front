export const MESSAGE_LIMIT = 300;
export const ROUTE_LIMIT = 200;
export const RELEASE_LIMIT = 64;

const ABSOLUTE_URL = /\b[a-z][a-z0-9+.-]*:\/\/[^\s"'<>()[\]{}]+/gi;
const PATH_WITH_QUERY = /(^|[\s"'(=])(\/[^\s"'<>()?#]*)[?#][^\s"'<>()]*/g;
const EMAIL = /[\w.+%-]+@[\w-]+(?:\.[\w-]+)+/g;
const UUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
const DIGITS = /\+?\d(?:[\s.-]?\d){5,}/g;
const URL_SAFE_TOKEN = /[A-Za-z0-9_-]{20,}/g;
const BASE64_TOKEN = /[A-Za-z0-9+/]{32,}={0,2}/g;
const HEX = /^[0-9a-f]+$/i;
const NUMERIC = /^\d+$/;

function looksLikeToken(value: string): boolean {
  if (HEX.test(value) && value.length >= 16) return true;
  return /\d/.test(value) && /[A-Za-z]/.test(value);
}

function stripQuery(url: string): string {
  const cut = url.search(/[?#]/);
  return cut === -1 ? url : url.slice(0, cut);
}

function truncate(value: string, limit: number): string {
  return value.length > limit ? value.slice(0, limit) : value;
}

export function sanitizeMessage(raw: string): string {
  const cleaned = raw
    .replace(ABSOLUTE_URL, stripQuery)
    .replace(PATH_WITH_QUERY, (_match, lead: string, path: string) => `${lead}${path}`)
    .replace(EMAIL, "[email]")
    .replace(UUID, ":id")
    .replace(BASE64_TOKEN, (match) => (match.startsWith("/") || !looksLikeToken(match) ? match : "[token]"))
    .replace(URL_SAFE_TOKEN, (match) => (looksLikeToken(match) ? "[token]" : match))
    .replace(DIGITS, "[number]")
    .replace(/\s+/g, " ")
    .trim();
  return truncate(cleaned, MESSAGE_LIMIT);
}

function isIdSegment(segment: string): boolean {
  if (NUMERIC.test(segment) || /\d{6,}/.test(segment)) return true;
  if (new RegExp(`^${UUID.source}$`, "i").test(segment)) return true;
  return segment.length >= 16 && looksLikeToken(segment) && !/[^A-Za-z0-9_-]/.test(segment);
}

export function sanitizeRoute(pathname: string): string {
  const path = stripQuery(pathname)
    .split("/")
    .map((segment) => (segment !== "" && isIdSegment(segment) ? ":id" : sanitizeMessage(segment)))
    .join("/");
  return truncate(path === "" ? "/" : path, ROUTE_LIMIT);
}

export function sanitizeRelease(release: string): string {
  const cleaned = release.replace(/[^\w.+-]/g, "");
  return truncate(cleaned === "" ? "unknown" : cleaned, RELEASE_LIMIT);
}

export function messageOf(value: unknown): string {
  if (value instanceof Error) {
    const name = value.name && value.name !== "Error" ? `${value.name}: ` : "";
    return `${name}${value.message}`;
  }
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "Unknown error";
}
