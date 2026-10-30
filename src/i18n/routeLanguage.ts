import { pageFor } from "../seo/pages";
import { languageOfHtmlLang, prefixedLanguage, type Language } from "./languages";

export function routeLanguage(pathname: string): Language | null {
  const prefixed = prefixedLanguage(pathname);
  if (prefixed) return prefixed;
  const page = pageFor(pathname);
  return page && !page.followsPreference ? languageOfHtmlLang(page.lang) : null;
}
