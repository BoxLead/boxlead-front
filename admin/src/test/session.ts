import { vi } from "vitest";
import type { AdminMe, AdminRole } from "../api/types";
import { json, mockFetch, type Reply } from "./fetch";

export const USER = { userId: "u1", email: "equipo@boxlead.app", name: "Equipo" };

export function adminMe(roles: AdminRole[]): AdminMe {
  return {
    userId: "u1",
    email: "equipo@boxlead.app",
    roles,
    factorConfirmed: true,
    enrollmentOpenUntil: null,
    factorLockedUntil: null,
    adminSessionExpiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
  };
}

export function readyBackend(roles: AdminRole[], handler: (method: string, url: URL) => Reply | undefined = () => undefined) {
  return mockFetch((method, url) => {
    const reply = handler(method, url);
    if (reply) return reply;
    if (url.pathname === "/auth/me") return json(200, USER);
    if (url.pathname === "/admin/me") return json(200, adminMe(roles));
    return json(404, { error: "Not found", message: "Not found" });
  });
}

export function stubReload() {
  const reload = vi.fn();
  vi.stubGlobal("location", { ...window.location, reload });
  return reload;
}
