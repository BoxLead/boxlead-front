import { DEFAULT_LANGUAGE, INTL_LOCALE, type Language } from "./languages";

let current: Language = DEFAULT_LANGUAGE;

export function setCurrentLanguage(language: Language): void {
  current = language;
}

export function currentLanguage(): Language {
  return current;
}

export function intlLocale(): string {
  return INTL_LOCALE[current];
}
