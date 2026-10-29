import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "../api/client";
import type { AppNotification } from "../api/types";
import { NOTIFICATIONS_POLL_MS, startNotificationWatcher } from "./notificationWatcher";

vi.mock("../api/client", () => ({
  api: { get: vi.fn(), post: vi.fn() },
}));

function notice(id: number): AppNotification {
  return { id, kind: "NEW_LEAD", platform: "WHATSAPP", leadId: null, conversationId: null, createdAt: "2026-10-29T12:00:00Z" };
}

const flush = () => vi.advanceTimersByTimeAsync(0);
let stop: (() => void) | null = null;

beforeEach(() => {
  vi.useFakeTimers();
  vi.mocked(api.post).mockResolvedValue(undefined);
});

afterEach(() => {
  stop?.();
  stop = null;
  vi.useRealTimers();
});

describe("notification watcher", () => {
  it("starts from the latest cursor so old notices stay quiet", async () => {
    vi.mocked(api.get).mockResolvedValueOnce({ notifications: [notice(1)], cursor: 7 });
    const onNotices = vi.fn();
    stop = startNotificationWatcher({ onNotices });
    await flush();
    expect(api.get).toHaveBeenCalledWith("/notifications");
    expect(onNotices).not.toHaveBeenCalled();
    expect(api.post).not.toHaveBeenCalled();
  });

  it("polls after the cursor, hands the batch over and marks it seen", async () => {
    vi.mocked(api.get)
      .mockResolvedValueOnce({ notifications: [], cursor: 7 })
      .mockResolvedValueOnce({ notifications: [notice(8), notice(9)], cursor: 9 })
      .mockResolvedValueOnce({ notifications: [], cursor: 9 });
    const onNotices = vi.fn();
    stop = startNotificationWatcher({ onNotices });
    await flush();
    await vi.advanceTimersByTimeAsync(NOTIFICATIONS_POLL_MS);
    expect(api.get).toHaveBeenLastCalledWith("/notifications?after=7");
    expect(onNotices).toHaveBeenCalledWith([notice(8), notice(9)]);
    expect(api.post).toHaveBeenCalledWith("/notifications/seen", { upTo: 9 });
    await vi.advanceTimersByTimeAsync(NOTIFICATIONS_POLL_MS);
    expect(api.get).toHaveBeenLastCalledWith("/notifications?after=9");
    expect(onNotices).toHaveBeenCalledTimes(1);
    expect(api.post).toHaveBeenCalledTimes(1);
  });

  it("reads every full page of a poll as one batch", async () => {
    const full = Array.from({ length: 50 }, (_, index) => notice(index + 1));
    vi.mocked(api.get)
      .mockResolvedValueOnce({ notifications: [], cursor: 0 })
      .mockResolvedValueOnce({ notifications: full, cursor: 50 })
      .mockResolvedValueOnce({ notifications: [notice(51)], cursor: 51 });
    const onNotices = vi.fn();
    stop = startNotificationWatcher({ onNotices });
    await flush();
    await vi.advanceTimersByTimeAsync(NOTIFICATIONS_POLL_MS);
    expect(api.get).toHaveBeenLastCalledWith("/notifications?after=50");
    expect(onNotices.mock.calls[0][0]).toHaveLength(51);
    expect(api.post).toHaveBeenCalledWith("/notifications/seen", { upTo: 51 });
  });

  it("waits while the tab is hidden and asks again when it comes back", async () => {
    const visibility = vi.spyOn(document, "visibilityState", "get").mockReturnValue("hidden");
    vi.mocked(api.get).mockResolvedValue({ notifications: [], cursor: 3 });
    stop = startNotificationWatcher({ onNotices: vi.fn() });
    await vi.advanceTimersByTimeAsync(NOTIFICATIONS_POLL_MS * 2);
    expect(api.get).not.toHaveBeenCalled();
    visibility.mockReturnValue("visible");
    document.dispatchEvent(new Event("visibilitychange"));
    await flush();
    expect(api.get).toHaveBeenCalledWith("/notifications");
  });

  it("keeps polling after a failed request and stops when asked", async () => {
    vi.mocked(api.get)
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce({ notifications: [], cursor: 4 });
    stop = startNotificationWatcher({ onNotices: vi.fn() });
    await flush();
    await vi.advanceTimersByTimeAsync(NOTIFICATIONS_POLL_MS);
    expect(api.get).toHaveBeenCalledTimes(2);
    stop();
    stop = null;
    await vi.advanceTimersByTimeAsync(NOTIFICATIONS_POLL_MS * 3);
    expect(api.get).toHaveBeenCalledTimes(2);
  });
});
