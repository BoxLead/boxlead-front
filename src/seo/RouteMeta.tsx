import { useLocation } from "react-router-dom";
import { titleWithBadge, useAppTitle, useTitleBadge } from "../hooks/useDocumentTitle";
import { PRODUCT_NAME } from "../util/company";
import { serializeJsonLd } from "./jsonLd";
import { pageFor, pageTitle, type PublicPage } from "./pages";
import { absoluteUrl, DEFAULT_OG_IMAGE, OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH } from "./site";

const OG_LOCALE: Record<PublicPage["lang"], string> = { "es-AR": "es_AR", en: "en_US" };

export function RouteMeta() {
  const { pathname } = useLocation();
  const appTitle = useAppTitle();
  const badge = useTitleBadge();
  const page = pageFor(pathname);
  if (!page) {
    return (
      <>
        <title>{titleWithBadge(appTitle ? `${appTitle} · ${PRODUCT_NAME}` : PRODUCT_NAME, badge)}</title>
        <meta name="robots" content="noindex" />
      </>
    );
  }

  const title = appTitle ? `${appTitle} · ${PRODUCT_NAME}` : pageTitle(page);
  const url = absoluteUrl(page.path);
  const image = absoluteUrl(page.image ?? DEFAULT_OG_IMAGE);
  const imageAlt = page.imageAlt ?? `${PRODUCT_NAME}, agentes de IA para ventas`;
  const alternates = page.alternates ?? [];
  const graph = page.jsonLd?.() ?? [];

  return (
    <>
      <title>{title}</title>
      <meta name="description" content={page.description} />
      {page.index ? <link rel="canonical" href={url} /> : <meta name="robots" content="noindex" />}
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content={PRODUCT_NAME} />
      <meta property="og:locale" content={OG_LOCALE[page.lang]} />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={page.description} />
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content={String(OG_IMAGE_WIDTH)} />
      <meta property="og:image:height" content={String(OG_IMAGE_HEIGHT)} />
      <meta property="og:image:alt" content={imageAlt} />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={page.description} />
      <meta name="twitter:image" content={image} />
      {alternates.map((alternate) => (
        <link rel="alternate" hrefLang={alternate.lang} href={absoluteUrl(alternate.path)} key={alternate.lang} />
      ))}
      {alternates.length > 0 ? (
        <link rel="alternate" hrefLang="x-default" href={absoluteUrl(alternates[0].path)} />
      ) : null}
      {graph.length > 0 ? (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(graph) }} />
      ) : null}
    </>
  );
}
