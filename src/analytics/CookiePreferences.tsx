import { useTranslation } from "react-i18next";
import { writeConsent } from "./consent";
import { ANALYTICS_ENABLED } from "./gtag";

export function CookiePreferences({ className }: { className: string }) {
  const { t } = useTranslation();
  if (!ANALYTICS_ENABLED) return null;
  return (
    <button type="button" className={className} onClick={() => writeConsent(null)}>
      {t("consent.preferences")}
    </button>
  );
}
