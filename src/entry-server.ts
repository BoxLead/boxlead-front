import { createElement } from "react";
import { prerender } from "react-dom/static";
import { StaticRouter } from "react-router-dom";
import { AppProviders } from "./AppProviders";

export { APP_SHELL_PATH, NOT_FOUND_PAGE, PUBLIC_PAGES } from "./seo/pages";

export async function render(url: string): Promise<string> {
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
