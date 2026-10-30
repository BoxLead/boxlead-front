import { i18n } from ".";
import { HTML_LANG, type Language } from "./languages";
import { preferredLanguage, storeLanguage } from "./preference";
import { routeLanguage } from "./routeLanguage";

export function applyLanguage(language: Language): void {
  document.documentElement.lang = HTML_LANG[language];
  if (i18n.language !== language) void i18n.changeLanguage(language);
}

export function chooseLanguage(language: Language): void {
  storeLanguage(language);
  applyLanguage(language);
}

export function initialLanguage(pathname: string): Language {
  return routeLanguage(pathname) ?? preferredLanguage();
}
