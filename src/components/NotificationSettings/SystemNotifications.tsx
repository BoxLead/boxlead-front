import { useState } from "react";
import { useTranslation } from "react-i18next";
import { requestSystemPermission, systemPermission, type SystemPermission } from "../Notifications/systemNotifications";
import { Tag, type TagTone } from "../ui/Tag";

const TONES: Record<SystemPermission, TagTone> = {
  default: "neutral",
  granted: "success",
  denied: "warning",
  unsupported: "neutral",
};

export function SystemNotifications({ browserOn }: { browserOn: boolean }) {
  const { t } = useTranslation("account");
  const [permission, setPermission] = useState<SystemPermission>(systemPermission);
  const [asking, setAsking] = useState(false);

  async function activate() {
    setAsking(true);
    setPermission(await requestSystemPermission());
    setAsking(false);
  }

  return (
    <div className="notification-system">
      <div className="notification-system-text">
        <p className="notification-system-title">
          <span>{t("notifications.system.title")}</span>
          <Tag tone={TONES[permission]}>{t(`notifications.system.${permission}`)}</Tag>
        </p>
        <p className="field-help" aria-live="polite">
          {t(`notifications.system.${permission}Help`)}
          {browserOn || permission === "unsupported" ? "" : ` ${t("notifications.system.needsBrowser")}`}
        </p>
      </div>
      {permission === "default" ? (
        <button type="button" className="btn btn-secondary" onClick={() => void activate()} disabled={asking}>
          {t("notifications.system.activate")}
        </button>
      ) : null}
    </div>
  );
}
