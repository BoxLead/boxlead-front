import type { NoticeMessage } from "../../util/notifications";
import { PRODUCT_NAME } from "../../util/company";

export type SystemPermission = NotificationPermission | "unsupported";

const ICON = "/icons/icon-192.png";

export function systemPermission(): SystemPermission {
  return typeof window !== "undefined" && "Notification" in window ? window.Notification.permission : "unsupported";
}

export async function requestSystemPermission(): Promise<SystemPermission> {
  if (systemPermission() === "unsupported") return "unsupported";
  try {
    return await window.Notification.requestPermission();
  } catch {
    return systemPermission();
  }
}

export function pageIsAway(): boolean {
  return document.visibilityState === "hidden" || !document.hasFocus();
}

export function showSystemNotices(messages: NoticeMessage[], onOpen: () => void): void {
  if (systemPermission() !== "granted" || !pageIsAway()) return;
  for (const message of messages) {
    try {
      const notification = new window.Notification(PRODUCT_NAME, {
        body: message.text,
        tag: `boxlead-${message.kind}`,
        icon: ICON,
      });
      notification.onclick = () => {
        window.focus();
        notification.close();
        onOpen();
      };
    } catch {
      return;
    }
  }
}
