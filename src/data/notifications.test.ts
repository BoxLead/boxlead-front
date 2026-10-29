import { beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../api/client";
import {
  fetchNotificationCursor,
  fetchNotificationsAfter,
  markNotificationsSeen,
  NOTIFICATION_SETTINGS_KEY,
  readUnsubscribeScope,
  saveNotificationSettings,
  unsubscribeNotifications,
} from "./notifications";
import { clearQueryCache, getQueryState } from "./queryCache";

vi.mock("../api/client", () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
}));

const NOTICE = {
  id: 8,
  kind: "HANDOFF",
  platform: "INSTAGRAM",
  leadId: null,
  conversationId: "c-1",
  createdAt: "2026-10-29T12:00:00Z",
};

beforeEach(() => {
  clearQueryCache();
});

describe("notifications data", () => {
  it("takes the cursor from the first page and never moves it back", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ notifications: [], cursor: 41 });
    await expect(fetchNotificationCursor()).resolves.toBe(41);
    vi.mocked(api.get).mockResolvedValueOnce({ notifications: [NOTICE], cursor: 3 });
    await expect(fetchNotificationsAfter(7)).resolves.toEqual({ notifications: [NOTICE], cursor: 7 });
    expect(api.get).toHaveBeenLastCalledWith("/notifications?after=7");
  });

  it("drops notices it does not understand", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({
      notifications: [NOTICE, { ...NOTICE, id: "9" }, { ...NOTICE, kind: "PAYMENT" }, { ...NOTICE, platform: "FAX" }, null],
      cursor: 12,
    });
    await expect(fetchNotificationsAfter(7)).resolves.toEqual({ notifications: [NOTICE], cursor: 12 });
    vi.mocked(api.get).mockResolvedValueOnce("nope");
    await expect(fetchNotificationsAfter(7)).resolves.toEqual({ notifications: [], cursor: 7 });
  });

  it("marks seen, saves the preferences and unsubscribes with the contract bodies", async () => {
    vi.mocked(api.post).mockResolvedValue(undefined);
    await markNotificationsSeen(12);
    expect(api.post).toHaveBeenCalledWith("/notifications/seen", { upTo: 12 });
    await unsubscribeNotifications("tok", "ALL");
    expect(api.post).toHaveBeenCalledWith("/notifications/unsubscribe", { token: "tok", scope: "ALL" });
    const saved = { newLeadEmail: false, handoffEmail: true, browser: true };
    vi.mocked(api.put).mockResolvedValue(saved);
    await expect(saveNotificationSettings(saved)).resolves.toBe(saved);
    expect(api.put).toHaveBeenCalledWith(NOTIFICATION_SETTINGS_KEY, saved);
    expect(getQueryState(NOTIFICATION_SETTINGS_KEY).data).toBe(saved);
  });

  it("reads only the unsubscribe scopes of the contract", () => {
    expect(readUnsubscribeScope("NEW_LEAD")).toBe("NEW_LEAD");
    expect(readUnsubscribeScope("HANDOFF")).toBe("HANDOFF");
    expect(readUnsubscribeScope("ALL")).toBe("ALL");
    expect(readUnsubscribeScope("all")).toBeNull();
    expect(readUnsubscribeScope(null)).toBeNull();
  });
});
