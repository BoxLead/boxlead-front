import { describe, expect, it, vi } from "vitest";
import { preloadRoute, registerRoutePreload, routesFor, type Preloadable } from "./routePreload";

function fakeRoute(): Preloadable {
  return { preload: vi.fn(() => Promise.resolve()) };
}

describe("routePreload", () => {
  it("picks the longest matching prefix and warms each chunk once", async () => {
    const app = fakeRoute();
    const leads = fakeRoute();
    registerRoutePreload("/t/app", [app]);
    registerRoutePreload("/t/app/leads", [app, leads]);

    expect(routesFor("/t/app/leads/42")).toEqual([app, leads]);
    expect(routesFor("/t/app/inbox")).toEqual([app]);
    expect(routesFor("/t/application")).toEqual([]);

    await preloadRoute("/t/app/leads");
    await preloadRoute("/t/app/leads/42");
    expect(app.preload).toHaveBeenCalledTimes(1);
    expect(leads.preload).toHaveBeenCalledTimes(1);
  });
});
