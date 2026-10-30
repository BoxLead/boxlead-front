import { i18n } from "../i18n";
import { HTML_LANG, type Language } from "../i18n/languages";
import { localizedPath } from "../i18n/paths";
import { plainText } from "../i18n/richText";
import { DURATION_LABEL, isoDuration, POSTER_SRC, VIDEO_SRC, VIDEO_UPLOAD_DATE } from "../landing/demoVideo";
import type { Faq } from "../landing/faq";
import { LEGAL_ENTITY_NAME, PRODUCT_NAME, SUPPORT_EMAIL } from "../util/company";
import { absoluteUrl } from "./site";

export type JsonLd = Record<string, unknown>;

const ORGANIZATION_ID = absoluteUrl("/#organization");
const WEBSITE_ID = absoluteUrl("/#website");
const APP_ID = absoluteUrl("/#software");

export const LOGO_PATH = "/icons/icon-512.png";

export function productDescription(language: Language): string {
  return i18n.getFixedT(language, "seo")("product.description");
}

export function organization(): JsonLd {
  return {
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: PRODUCT_NAME,
    legalName: LEGAL_ENTITY_NAME,
    url: absoluteUrl("/"),
    logo: { "@type": "ImageObject", url: absoluteUrl(LOGO_PATH), width: 512, height: 512 },
    email: SUPPORT_EMAIL,
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: SUPPORT_EMAIL,
      availableLanguage: ["es", "en"],
    },
    areaServed: ["AR", "UY", "CL", "MX", "CO", "PE"],
  };
}

export function webSite(language: Language): JsonLd {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: absoluteUrl(localizedPath("/", language)),
    name: PRODUCT_NAME,
    inLanguage: HTML_LANG[language],
    publisher: { "@id": ORGANIZATION_ID },
  };
}

export function softwareApplication(language: Language): JsonLd {
  const t = i18n.getFixedT(language, "seo");
  return {
    "@type": "SoftwareApplication",
    "@id": APP_ID,
    name: PRODUCT_NAME,
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "CRM",
    operatingSystem: "Web",
    url: absoluteUrl(localizedPath("/", language)),
    description: t("product.description"),
    featureList: t("product.features", { returnObjects: true }),
    inLanguage: HTML_LANG[language],
    publisher: { "@id": ORGANIZATION_ID },
  };
}

export function demoVideo(language: Language): JsonLd {
  const t = i18n.getFixedT(language, "seo");
  return {
    "@type": "VideoObject",
    name: t("video.title"),
    description: t("video.description"),
    thumbnailUrl: [absoluteUrl(POSTER_SRC)],
    contentUrl: absoluteUrl(VIDEO_SRC),
    uploadDate: VIDEO_UPLOAD_DATE,
    duration: isoDuration(DURATION_LABEL),
    inLanguage: HTML_LANG.es,
    publisher: { "@id": ORGANIZATION_ID },
  };
}

export function faqPage(faqs: Faq[]): JsonLd {
  return {
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: plainText(faq.answer) },
    })),
  };
}

export type Crumb = { name: string; path: string };

export function breadcrumbs(crumbs: Crumb[]): JsonLd {
  return {
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  };
}

export function webPage(path: string, name: string, description: string, lang: string): JsonLd {
  return {
    "@type": "WebPage",
    "@id": absoluteUrl(path),
    url: absoluteUrl(path),
    name,
    description,
    inLanguage: lang,
    isPartOf: { "@id": WEBSITE_ID },
    about: { "@id": APP_ID },
  };
}
