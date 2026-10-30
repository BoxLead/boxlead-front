import { useTranslation } from "react-i18next";
import { DEFAULT_LANGUAGE, isLanguage, type Language } from "./languages";
import { localizedPath } from "./paths";

export function useLanguage(): Language {
  const { i18n } = useTranslation();
  return isLanguage(i18n.language) ? i18n.language : DEFAULT_LANGUAGE;
}

export function useLocalizedPath(): (target: string) => string {
  const language = useLanguage();
  return (target) => localizedPath(target, language);
}
