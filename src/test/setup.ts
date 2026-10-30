import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { i18n, LAZY_NAMESPACES } from "../i18n";

await i18n.loadNamespaces(LAZY_NAMESPACES);

afterEach(async () => {
  cleanup();
  sessionStorage.clear();
  localStorage.clear();
  delete document.documentElement.dataset.theme;
  delete document.documentElement.dataset.sidebar;
  if (i18n.language !== "es") await i18n.changeLanguage("es");
});
