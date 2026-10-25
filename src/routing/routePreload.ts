import type { LazyRoute } from "./lazyRoute";

type Prefix = { prefix: string; routes: LazyRoute[] };

const registry: Prefix[] = [];

export function registerRoutePreload(prefix: string, routes: LazyRoute[]): void {
  registry.push({ prefix, routes });
}

export function routesFor(pathname: string): LazyRoute[] {
  const matches = registry
    .filter(({ prefix }) => pathname === prefix || pathname.startsWith(prefix.endsWith("/") ? prefix : `${prefix}/`))
    .sort((a, b) => b.prefix.length - a.prefix.length);
  return matches.length > 0 ? matches[0].routes : [];
}

const warmed = new Set<LazyRoute>();

export function preloadRoute(pathname: string): Promise<void> {
  const pending = routesFor(pathname)
    .filter((route) => !warmed.has(route))
    .map((route) => {
      warmed.add(route);
      return route.preload();
    });
  return Promise.all(pending).then(() => undefined);
}

export function preloadOnIdle(pathname: string): void {
  const run = () => void preloadRoute(pathname);
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(run, { timeout: 2000 });
    return;
  }
  window.setTimeout(run, 300);
}
