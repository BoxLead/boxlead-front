import { describe, expect, it } from "vitest";
import type { AdminMe } from "../api/types";
import { canAccess } from "./roles";
import { stageFor } from "./session";

const NOW = Date.parse("2026-10-26T12:00:00Z");
const LATER = "2026-10-26T12:30:00Z";
const EARLIER = "2026-10-26T11:00:00Z";

const ME: AdminMe = {
  userId: "u1",
  email: "equipo@boxlead.app",
  roles: ["SUPPORT"],
  factorConfirmed: true,
  enrollmentOpenUntil: null,
  factorLockedUntil: null,
  adminSessionExpiresAt: null,
};

describe("canAccess", () => {
  it("lets the owner see everything and the rest only their screens", () => {
    expect(canAccess(["OWNER"], ["FINANCE"])).toBe(true);
    expect(canAccess(["SUPPORT"], "ANY")).toBe(true);
    expect(canAccess(["SUPPORT"], ["FINANCE"])).toBe(false);
    expect(canAccess(["SUPPORT", "FINANCE"], ["FINANCE"])).toBe(true);
    expect(canAccess([], "ANY")).toBe(false);
  });
});

describe("stageFor", () => {
  it("follows the entry flow of the plan", () => {
    expect(stageFor({ ...ME, roles: [] }, false, NOW).kind).toBe("no-access");
    expect(stageFor({ ...ME, factorConfirmed: false, enrollmentOpenUntil: LATER }, false, NOW).kind).toBe("enroll");
    expect(stageFor({ ...ME, factorConfirmed: false, enrollmentOpenUntil: EARLIER }, false, NOW).kind).toBe("enrollment-closed");
    expect(stageFor({ ...ME, factorConfirmed: false }, false, NOW).kind).toBe("enrollment-closed");
    expect(stageFor(ME, true, NOW)).toEqual({ kind: "code", me: ME, enrolled: true });
    expect(stageFor({ ...ME, adminSessionExpiresAt: EARLIER }, false, NOW).kind).toBe("code");
    expect(stageFor({ ...ME, adminSessionExpiresAt: LATER }, false, NOW).kind).toBe("ready");
  });
});
