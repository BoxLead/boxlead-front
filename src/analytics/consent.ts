import { useSyncExternalStore } from "react";

export type Consent = "granted" | "denied";

export const CONSENT_KEY = "boxlead.consent";

const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function readConsent(): Consent | null {
  try {
    const stored = localStorage.getItem(CONSENT_KEY);
    return stored === "granted" || stored === "denied" ? stored : null;
  } catch {
    return null;
  }
}

export function writeConsent(consent: Consent | null): void {
  try {
    if (consent) localStorage.setItem(CONSENT_KEY, consent);
    else localStorage.removeItem(CONSENT_KEY);
  } catch {
    return;
  } finally {
    emit();
  }
}

export function useConsent(): Consent | null | undefined {
  return useSyncExternalStore(subscribe, readConsent, () => undefined);
}
