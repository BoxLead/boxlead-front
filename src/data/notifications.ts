import { api } from "../api/client";
import type {
  AppNotification,
  NotificationKind,
  NotificationSettings,
  NotificationsPage,
  PlatformType,
  UnsubscribeScope,
} from "../api/types";
import { setQueryData } from "./queryCache";

export const NOTIFICATIONS_KEY = "/notifications";
export const NOTIFICATION_SETTINGS_KEY = "/notifications/settings";
export const NOTIFICATIONS_PAGE_SIZE = 50;

const KINDS: readonly NotificationKind[] = ["NEW_LEAD", "HANDOFF"];
const PLATFORMS: readonly PlatformType[] = ["META", "INSTAGRAM", "WHATSAPP", "MELI", "TIKTOK", "GOOGLE_ADS"];
const SCOPES: readonly UnsubscribeScope[] = ["NEW_LEAD", "HANDOFF", "ALL"];

function isNotification(item: unknown): item is AppNotification {
  return (
    typeof item === "object" &&
    item !== null &&
    "id" in item &&
    typeof item.id === "number" &&
    "kind" in item &&
    KINDS.some((kind) => kind === item.kind) &&
    "platform" in item &&
    PLATFORMS.some((platform) => platform === item.platform)
  );
}

export function readNotificationsPage(value: unknown, fallbackCursor: number): NotificationsPage {
  if (!value || typeof value !== "object") return { notifications: [], cursor: fallbackCursor };
  const cursor = "cursor" in value && typeof value.cursor === "number" ? value.cursor : fallbackCursor;
  const items = "notifications" in value && Array.isArray(value.notifications) ? value.notifications : [];
  return { notifications: items.filter(isNotification), cursor: Math.max(cursor, fallbackCursor) };
}

export async function fetchNotificationCursor(): Promise<number> {
  return readNotificationsPage(await api.get<unknown>(NOTIFICATIONS_KEY), 0).cursor;
}

export async function fetchNotificationsAfter(cursor: number): Promise<NotificationsPage> {
  const query = new URLSearchParams({ after: String(cursor) }).toString();
  return readNotificationsPage(await api.get<unknown>(`${NOTIFICATIONS_KEY}?${query}`), cursor);
}

export function markNotificationsSeen(upTo: number): Promise<void> {
  return api.post<void>(`${NOTIFICATIONS_KEY}/seen`, { upTo });
}

export async function saveNotificationSettings(settings: NotificationSettings): Promise<NotificationSettings> {
  const saved = await api.put<NotificationSettings>(NOTIFICATION_SETTINGS_KEY, settings);
  setQueryData<NotificationSettings>(NOTIFICATION_SETTINGS_KEY, () => saved);
  return saved;
}

export function unsubscribeNotifications(token: string, scope: UnsubscribeScope): Promise<void> {
  return api.post<void>(`${NOTIFICATIONS_KEY}/unsubscribe`, { token, scope });
}

export function readUnsubscribeScope(value: string | null): UnsubscribeScope | null {
  return SCOPES.find((scope) => scope === value) ?? null;
}
