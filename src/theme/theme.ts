import { useSyncExternalStore } from "react";

export type Theme = "light" | "dark";
export type SidebarMode = "expanded" | "collapsed";

export const THEME_KEY = "boxlead.theme";
export const SIDEBAR_KEY = "boxlead.sidebar";

const THEME_COLOR: Record<Theme, string> = {
  light: "#f4f3ec",
  dark: "#0a1521",
};

const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function resolveTheme(stored: string | null, prefersLight: boolean): Theme {
  if (stored === "light" || stored === "dark") return stored;
  return prefersLight ? "light" : "dark";
}

export function resolveSidebar(stored: string | null): SidebarMode {
  return stored === "collapsed" ? "collapsed" : "expanded";
}

function storageAllowed(error: unknown): boolean {
  return error instanceof DOMException;
}

function readKey(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    if (storageAllowed(error)) return null;
    throw error;
  }
}

function writeKey(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    if (storageAllowed(error)) return;
    throw error;
  }
}

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.dataset.themeSwitching = "";
  root.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", THEME_COLOR[theme]);
  void root.offsetHeight;
  requestAnimationFrame(() => {
    delete root.dataset.themeSwitching;
  });
}

export function applySidebar(mode: SidebarMode): void {
  document.documentElement.dataset.sidebar = mode;
}

function prefersLight(): boolean {
  return typeof window.matchMedia === "function" && window.matchMedia("(prefers-color-scheme: light)").matches;
}

function themeSnapshot(): Theme {
  const stored = document.documentElement.dataset.theme;
  if (stored === "light" || stored === "dark") return stored;
  return resolveTheme(readKey(THEME_KEY), prefersLight());
}

function sidebarSnapshot(): SidebarMode {
  const stored = document.documentElement.dataset.sidebar;
  if (stored === "expanded" || stored === "collapsed") return stored;
  return resolveSidebar(readKey(SIDEBAR_KEY));
}

export function setTheme(theme: Theme): void {
  writeKey(THEME_KEY, theme);
  applyTheme(theme);
  emit();
}

export function setSidebar(mode: SidebarMode): void {
  writeKey(SIDEBAR_KEY, mode);
  applySidebar(mode);
  emit();
}

export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, themeSnapshot, () => "dark");
}

export function useSidebar(): SidebarMode {
  return useSyncExternalStore(subscribe, sidebarSnapshot, () => "expanded");
}
