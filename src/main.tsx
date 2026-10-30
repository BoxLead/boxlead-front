import { createRoot, hydrateRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "@fontsource-variable/inter";
import "./index.css";
import { AppProviders } from "./AppProviders";
import { applyLanguage, initialLanguage } from "./i18n/apply";
import { HTML_LANG } from "./i18n/languages";
import { preloadOnIdle, preloadRoute } from "./routing";

const prerenderedLang = document.documentElement.lang;
const language = initialLanguage(window.location.pathname);
applyLanguage(language);

const container = document.getElementById("root")!;
const app = (
  <BrowserRouter>
    <AppProviders />
  </BrowserRouter>
);

if (container.firstElementChild && prerenderedLang === HTML_LANG[language]) {
  void preloadRoute(window.location.pathname).then(() => hydrateRoot(container, app));
} else {
  void preloadRoute(window.location.pathname).then(() => createRoot(container).render(app));
  preloadOnIdle(window.location.pathname);
}
