import { writeConsent } from "./consent";
import { ANALYTICS_ENABLED } from "./gtag";

export function CookiePreferences({ className }: { className: string }) {
  if (!ANALYTICS_ENABLED) return null;
  return (
    <button type="button" className={className} onClick={() => writeConsent(null)}>
      Preferencias de cookies
    </button>
  );
}
