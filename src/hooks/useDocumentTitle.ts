import { useEffect, useSyncExternalStore } from "react";

let current: string | null = null;
let badge = 0;
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

export function setTitleBadge(count: number): void {
  if (badge === count) return;
  badge = count;
  emit();
}

export function useTitleBadge(): number {
  return useSyncExternalStore(subscribe, () => badge, () => 0);
}

export function titleWithBadge(title: string, count: number): string {
  return count > 0 ? `(${count > 99 ? "99+" : count}) ${title}` : title;
}
