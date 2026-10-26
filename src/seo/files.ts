import { CONNECTABLE_PLATFORMS } from "../platforms";
import { LEGAL_ENTITY_NAME, PRODUCT_NAME, SUPPORT_EMAIL } from "../util/company";
import { pageTitle, PUBLIC_PAGES, type PublicPage } from "./pages";
import { absoluteUrl, SITE_ORIGIN } from "./site";
import { PRODUCT_DESCRIPTION } from "./structuredData";

export type SitemapEntry = { page: PublicPage; lastmod: string };

function escapeXml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function indexablePages(): PublicPage[] {
  return PUBLIC_PAGES.filter((page) => page.index);
}

export function buildSitemap(entries: SitemapEntry[]): string {
  const urls = entries.map(({ page, lastmod }) => {
    const alternates = (page.alternates ?? []).map(
      (alternate) => `    <xhtml:link rel="alternate" hreflang="${alternate.lang}" href="${escapeXml(absoluteUrl(alternate.path))}"/>`,
    );
    const lines = [
      "  <url>",
      `    <loc>${escapeXml(absoluteUrl(page.path))}</loc>`,
      `    <lastmod>${lastmod}</lastmod>`,
      ...(page.changefreq ? [`    <changefreq>${page.changefreq}</changefreq>`] : []),
      ...(page.priority !== undefined ? [`    <priority>${page.priority.toFixed(1)}</priority>`] : []),
      ...alternates,
      "  </url>",
    ];
    return lines.join("\n");
  });
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...urls,
    "</urlset>",
    "",
  ].join("\n");
}

export function buildRobots(): string {
  return ["User-agent: *", "Allow: /", "Disallow: /app", "Disallow: /app/", "Disallow: /social/", "", `Sitemap: ${absoluteUrl("/sitemap.xml")}`, ""].join("\n");
}

export function buildLlms(): string {
  const channels = CONNECTABLE_PLATFORMS.map((platform) => `- ${platform.name}. ${platform.summary}`);
  const pages = indexablePages().map((page) => `- [${pageTitle(page)}](${absoluteUrl(page.path)}). ${page.description}`);
  return [
    `# ${PRODUCT_NAME}`,
    "",
    `> ${PRODUCT_DESCRIPTION}`,
    "",
    `${PRODUCT_NAME} es una marca de ${LEGAL_ENTITY_NAME}, una empresa argentina. El producto se ofrece en castellano rioplatense para pymes, community managers y agencias de Argentina y Latinoamérica. Se contrata por suscripción mensual y no publica precios en el sitio.`,
    "",
    "## Canales",
    "",
    ...channels,
    "",
    "## Páginas",
    "",
    ...pages,
    "",
    "## Contacto",
    "",
    `- Email de soporte y ventas ${SUPPORT_EMAIL}`,
    `- Sitio ${SITE_ORIGIN}`,
    "",
  ].join("\n");
}
