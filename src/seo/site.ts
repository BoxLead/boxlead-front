export const SITE_ORIGIN = "https://boxlead.app";
export const SITE_LOCALE = "es-AR";
export const DEFAULT_OG_IMAGE = "/og/boxlead.png";
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

export function absoluteUrl(path: string): string {
  return `${SITE_ORIGIN}${path === "/" ? "/" : path}`;
}

export function normalizePath(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, "");
  return trimmed === "" ? "/" : trimmed;
}
