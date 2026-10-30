import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import { applyLanguage } from "./apply";
import { preferredLanguage } from "./preference";
import { routeLanguage } from "./routeLanguage";

export function LanguageSync() {
  const { pathname } = useLocation();
  const fixed = routeLanguage(pathname);
  useLayoutEffect(() => {
    applyLanguage(fixed ?? preferredLanguage());
  }, [fixed]);
  return null;
}
