import { browserLanguage, DEFAULT_LANGUAGE, isLanguage, type Language } from "./languages";

export const APP_FOLLOWS_PREFERENCE = false;

export const LANGUAGE_KEY = "boxlead.language";

function storageError(error: unknown): boolean {
  return error instanceof DOMException;
}

export function storedLanguage(): Language | null {
  try {
    const stored = localStorage.getItem(LANGUAGE_KEY);
    return isLanguage(stored) ? stored : null;
  } catch (error) {
    if (storageError(error)) return null;
    throw error;
  }
}

export function storeLanguage(language: Language): void {
  try {
    localStorage.setItem(LANGUAGE_KEY, language);
  } catch (error) {
    if (storageError(error)) return;
    throw error;
  }
}

export function preferredLanguage(): Language {
  return storedLanguage() ?? browserLanguage(navigator.languages ?? [navigator.language]);
}

export function appLanguage(): Language {
  return APP_FOLLOWS_PREFERENCE ? preferredLanguage() : DEFAULT_LANGUAGE;
}
