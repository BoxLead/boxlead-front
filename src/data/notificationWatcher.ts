import type { AppNotification } from "../api/types";
import { fetchNotificationCursor, fetchNotificationsAfter, markNotificationsSeen, NOTIFICATIONS_PAGE_SIZE } from "./notifications";

export const NOTIFICATIONS_POLL_MS = 20_000;
const MAX_PAGES_PER_POLL = 5;

type WatcherOptions = {
  onNotices: (notices: AppNotification[]) => void;
  interval?: number;
};

export function startNotificationWatcher({ onNotices, interval = NOTIFICATIONS_POLL_MS }: WatcherOptions): () => void {
  let cursor: number | null = null;
  let stopped = false;
  let running = false;

  async function collect(from: number): Promise<{ notices: AppNotification[]; cursor: number }> {
    const notices: AppNotification[] = [];
    let next = from;
    for (let page = 0; page < MAX_PAGES_PER_POLL; page += 1) {
      const result = await fetchNotificationsAfter(next);
      notices.push(...result.notifications);
      next = result.cursor;
      if (stopped || result.notifications.length < NOTIFICATIONS_PAGE_SIZE) break;
    }
    return { notices, cursor: next };
  }

  async function poll() {
    if (stopped || running || document.visibilityState !== "visible") return;
    running = true;
    try {
      if (cursor === null) {
        const start = await fetchNotificationCursor();
        if (!stopped) cursor = start;
        return;
      }
      const result = await collect(cursor);
      if (stopped) return;
      cursor = result.cursor;
      if (result.notices.length === 0) return;
      onNotices(result.notices);
      await markNotificationsSeen(result.cursor).catch(() => undefined);
    } catch {
      return;
    } finally {
      running = false;
    }
  }

  const onVisible = () => {
    if (document.visibilityState === "visible") void poll();
  };

  void poll();
  const timer = setInterval(() => void poll(), interval);
  document.addEventListener("visibilitychange", onVisible);

  return () => {
    stopped = true;
    clearInterval(timer);
    document.removeEventListener("visibilitychange", onVisible);
  };
}
