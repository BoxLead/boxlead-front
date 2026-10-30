import type { PlatformType } from "../api/types";
import { i18n } from "../i18n";
import type { Language } from "../i18n/languages";
import { localizedPath } from "../i18n/paths";
import type { Faq } from "./faq";

export type EditorialSlug = "whatsapp" | "instagram" | "messenger" | "mercadolibre" | "agencias";

export type Capability = { title: string; description: string };

export type EditorialStep = { title: string; description: string };

export type EditorialPageData = {
  slug: EditorialSlug;
  basePath: string;
  path: string;
  platform: PlatformType | null;
  label: string;
  title: string;
  description: string;
  heading: string;
  lead: string;
  capabilitiesHeading: string;
  capabilities: Capability[];
  stepsHeading: string;
  steps: EditorialStep[];
  faqs: Faq[];
  related: EditorialSlug[];
};

type EditorialSource = { slug: EditorialSlug; platform: PlatformType | null; related: EditorialSlug[] };

const SOURCES: EditorialSource[] = [
  { slug: "whatsapp", platform: "WHATSAPP", related: ["instagram", "mercadolibre", "messenger"] },
  { slug: "instagram", platform: "INSTAGRAM", related: ["whatsapp", "messenger", "mercadolibre"] },
  { slug: "messenger", platform: "META", related: ["whatsapp", "instagram", "mercadolibre"] },
  { slug: "mercadolibre", platform: "MELI", related: ["whatsapp", "instagram", "messenger"] },
  { slug: "agencias", platform: null, related: ["whatsapp", "instagram", "mercadolibre"] },
];

export function editorialPages(language: Language): EditorialPageData[] {
  const t = i18n.getFixedT(language, "channels");
  return SOURCES.map((source) => {
    const basePath = `/${source.slug}`;
    return { ...source, basePath, path: localizedPath(basePath, language), ...t(source.slug, { returnObjects: true }) };
  });
}

export function editorialPage(basePath: string, language: Language): EditorialPageData | null {
  return editorialPages(language).find((page) => page.basePath === basePath) ?? null;
}
