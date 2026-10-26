import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { ConsentBanner } from "./ConsentBanner";
import { ANALYTICS_ENABLED, isPublicPath, startAnalytics, trackPageView } from "./gtag";

export function Analytics() {
  const { pathname } = useLocation();
  const publicPage = isPublicPath(pathname);

  useEffect(() => {
    if (!ANALYTICS_ENABLED || !publicPage) return;
    startAnalytics(pathname);
    const timer = window.setTimeout(() => trackPageView(pathname, document.title), 0);
    return () => window.clearTimeout(timer);
  }, [pathname, publicPage]);

  if (!ANALYTICS_ENABLED || !publicPage) return null;
  return <ConsentBanner />;
}
