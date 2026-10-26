import { createRoot, hydrateRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "@fontsource-variable/inter";
import "./index.css";
import { AppProviders } from "./AppProviders";
import { preloadOnIdle, preloadRoute } from "./routing";

const container = document.getElementById("root")!;
const app = (
  <BrowserRouter>
    <AppProviders />
  </BrowserRouter>
);

if (container.firstElementChild) {
  void preloadRoute(window.location.pathname).then(() => hydrateRoot(container, app));
} else {
  createRoot(container).render(app);
  preloadOnIdle(window.location.pathname);
}
