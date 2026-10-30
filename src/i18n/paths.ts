import { EDITORIAL_PATHS } from "../landing/editorialPaths";
import { DEFAULT_LANGUAGE, LANGUAGE_PREFIX, LANGUAGES, stripLanguage, type Language } from "./languages";

export const TRANSLATED_PATHS: readonly string[] = ["/", ...EDITORIAL_PATHS];

const translated = new Set(TRANSLATED_PATHS);

const COUNTERPARTS: Record<string, Partial<Record<Language, string>>> = {
  "/terminos": { en: "/terms-of-service" },
  "/privacidad": { en: "/privacy-policy" },
};

function split(target: string): { path: string; suffix: string } {
  const cut = target.search(/[?#]/);
  if (cut === -1) return { path: target, suffix: "" };
  return { path: target.slice(0, cut) || "/", suffix: target.slice(cut) };
}

export function isTranslated(path: string): boolean {
  return translated.has(path);
}

export function localizedPath(target: string, language: Language): string {
  if (language === DEFAULT_LANGUAGE || !target.startsWith("/")) return target;
  const { path, suffix } = split(target);
  const counterpart = COUNTERPARTS[path]?.[language];
  if (counterpart) return `${counterpart}${suffix}`;
  if (!translated.has(path)) return target;
  const prefix = LANGUAGE_PREFIX[language];
  return `${path === "/" ? prefix : `${prefix}${path}`}${suffix}`;
}

export function alternatePaths(pathname: string): { language: Language; path: string }[] {
  const base = stripLanguage(pathname);
  if (!translated.has(base)) return [];
  return LANGUAGES.map((language) => ({ language, path: localizedPath(base, language) }));
}
