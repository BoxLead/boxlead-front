import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { NotificationSettings } from "../../api/types";
import { useAuth } from "../../context/auth";
import { CONVERSATIONS_KEY } from "../../data/conversations";
import { startNotificationWatcher } from "../../data/notificationWatcher";
import { NOTIFICATION_SETTINGS_KEY } from "../../data/notifications";
import { invalidateQueries } from "../../data/queryCache";
import { useApiQuery } from "../../hooks/useApiQuery";
import { setTitleBadge } from "../../hooks/useDocumentTitle";
import { noticeMessages } from "../../util/notifications";
import { useToast } from "../ui/toast";
import { showSystemNotices } from "./systemNotifications";

const INBOX_PATH = "/app/inbox";
const LEADS_KEY_PREFIX = "/leads";

function isInbox(pathname: string): boolean {
  return pathname === INBOX_PATH || pathname.startsWith(`${INBOX_PATH}/`);
}

function ActiveWatcher() {
  const toast = useToast();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const onInbox = isInbox(pathname);
  const onInboxRef = useRef(onInbox);
  const toastRef = useRef(toast);
  const navigateRef = useRef(navigate);
  const unseen = useRef(0);

  useEffect(() => {
    toastRef.current = toast;
    navigateRef.current = navigate;
  }, [toast, navigate]);

  useEffect(() => {
    onInboxRef.current = onInbox;
    if (onInbox) {
      unseen.current = 0;
      setTitleBadge(0);
    }
  }, [onInbox]);

  useEffect(() => {
    const clear = () => {
      unseen.current = 0;
      setTitleBadge(0);
    };
    window.addEventListener("focus", clear);
    const stop = startNotificationWatcher({
      onNotices: (notices) => {
        const messages = noticeMessages(notices);
        for (const message of messages) toastRef.current({ tone: "info", message: message.text });
        void invalidateQueries(CONVERSATIONS_KEY);
        void invalidateQueries(LEADS_KEY_PREFIX);
        if (!(onInboxRef.current && document.hasFocus())) {
          unseen.current += notices.length;
          setTitleBadge(unseen.current);
        }
        showSystemNotices(messages, () => navigateRef.current(INBOX_PATH));
      },
    });
    return () => {
      stop();
      window.removeEventListener("focus", clear);
      setTitleBadge(0);
    };
  }, []);

  return null;
}

export function NotificationWatcher() {
  const { features } = useAuth();
  const settings = useApiQuery<NotificationSettings>(features.notifications ? NOTIFICATION_SETTINGS_KEY : null);
  return features.notifications && settings.data?.browser === true ? <ActiveWatcher /> : null;
}
