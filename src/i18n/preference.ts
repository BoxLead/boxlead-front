import { browserLanguage, isLanguage, type Language } from "./languages";

export const LANGUAGE_KEY = "boxlead.language";
export const VISIT_KEY = "boxlead.language.visit";

function storageError(error: unknown): boolean {
  return error instanceof DOMException;
}

function read(storage: () => Storage, key: string): Language | null {
  try {
    const stored = storage().getItem(key);
    return isLanguage(stored) ? stored : null;
  } catch (error) {
    if (storageError(error)) return null;
    throw error;
  }
}

function write(storage: () => Storage, key: string, language: Language): void {
  try {
    storage().setItem(key, language);
  } catch (error) {
    if (storageError(error)) return;
    throw error;
  }
}

export function storedLanguage(): Language | null {
  return read(() => localStorage, LANGUAGE_KEY);
}

export function storeLanguage(language: Language): void {
  write(() => localStorage, LANGUAGE_KEY, language);
}

export function visitedLanguage(): Language | null {
  return read(() => sessionStorage, VISIT_KEY);
}

export function rememberVisit(language: Language): void {
  write(() => sessionStorage, VISIT_KEY, language);
}

export function preferredLanguage(): Language {
  return storedLanguage() ?? visitedLanguage() ?? browserLanguage(navigator.languages ?? [navigator.language]);
}
