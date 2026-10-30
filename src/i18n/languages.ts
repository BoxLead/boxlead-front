export const LANGUAGES = ["es", "en"] as const;

export type Language = (typeof LANGUAGES)[number];

export const DEFAULT_LANGUAGE: Language = "es";

export type HtmlLang = "es-AR" | "en";

export const HTML_LANG: Record<Language, HtmlLang> = { es: "es-AR", en: "en" };

export const INTL_LOCALE: Record<Language, string> = { es: "es-AR", en: "en-US" };

export const LANGUAGE_PREFIX: Record<Language, string> = { es: "", en: "/en" };

export function isLanguage(value: unknown): value is Language {
  return typeof value === "string" && (LANGUAGES as readonly string[]).includes(value);
}

export function languageOfHtmlLang(lang: string): Language {
  return lang.toLowerCase().startsWith("en") ? "en" : "es";
}

export function prefixedLanguage(pathname: string): Language | null {
  for (const language of LANGUAGES) {
    const prefix = LANGUAGE_PREFIX[language];
    if (prefix && (pathname === prefix || pathname.startsWith(`${prefix}/`))) return language;
  }
  return null;
}

export function stripLanguage(pathname: string): string {
  const language = prefixedLanguage(pathname);
  if (!language) return pathname;
  const rest = pathname.slice(LANGUAGE_PREFIX[language].length);
  return rest === "" ? "/" : rest;
}

export function browserLanguage(languages: readonly string[]): Language {
  for (const candidate of languages) {
    const base = candidate.toLowerCase().split("-")[0];
    if (isLanguage(base)) return base;
  }
  return DEFAULT_LANGUAGE;
}
