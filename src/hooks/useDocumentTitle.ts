import { useEffect, useSyncExternalStore } from "react";

let current: string | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useDocumentTitle(title: string) {
  useEffect(() => {
    current = title;
    emit();
    return () => {
      if (current === title) {
        current = null;
        emit();
      }
    };
  }, [title]);
}

export function useAppTitle(): string | null {
  return useSyncExternalStore(subscribe, () => current, () => null);
}
