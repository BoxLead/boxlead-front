import { createElement } from "react";
import { prerender } from "react-dom/static";
import { StaticRouter } from "react-router-dom";
import { AppProviders } from "./AppProviders";
import { i18n, LAZY_NAMESPACES } from "./i18n";
import { DEFAULT_LANGUAGE } from "./i18n/languages";
import { routeLanguage } from "./i18n/routeLanguage";

export { buildLlms, buildRobots, buildSitemap, indexablePages } from "./seo/files";
export { APP_SHELL_PATH, NOT_FOUND_PAGE, PUBLIC_PAGES } from "./seo/pages";

export async function render(url: string): Promise<string> {
  await i18n.loadNamespaces(LAZY_NAMESPACES);
  await i18n.changeLanguage(routeLanguage(url) ?? DEFAULT_LANGUAGE);
  let failure: unknown = null;
  const { prelude } = await prerender(createElement(StaticRouter, { location: url }, createElement(AppProviders)), {
    onError(error) {
      failure = error;
    },
  });
  const html = await new Response(prelude).text();
  if (failure) throw failure;
  return html;
}
