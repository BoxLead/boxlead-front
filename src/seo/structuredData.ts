import { DURATION_LABEL, isoDuration, POSTER_SRC, VIDEO_DESCRIPTION, VIDEO_SRC, VIDEO_TITLE, VIDEO_UPLOAD_DATE } from "../landing/demoVideo";
import { faqText, type Faq } from "../landing/faq";
import { LEGAL_ENTITY_NAME, PRODUCT_NAME, SUPPORT_EMAIL } from "../util/company";
import { absoluteUrl, SITE_LOCALE } from "./site";

export type JsonLd = Record<string, unknown>;

const ORGANIZATION_ID = absoluteUrl("/#organization");
const WEBSITE_ID = absoluteUrl("/#website");
const APP_ID = absoluteUrl("/#software");

export const LOGO_PATH = "/icons/icon-512.png";

export const PRODUCT_DESCRIPTION =
  "Agente de ventas con IA que centraliza y responde en automático los leads de WhatsApp, Instagram, Messenger y MercadoLibre, los califica y los ordena en una sola bandeja.";

export const PRODUCT_FEATURES = [
  "Bandeja única para WhatsApp, Instagram, Messenger y MercadoLibre",
  "Agentes de IA que responden con la información del negocio las 24 horas",
  "Calificación automática de leads y pipeline ordenado",
  "Borradores para aprobar cuando hace falta una persona",
  "Métricas de respuesta y de calificación por canal",
];

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

export function webSite(): JsonLd {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    url: absoluteUrl("/"),
    name: PRODUCT_NAME,
    inLanguage: SITE_LOCALE,
    publisher: { "@id": ORGANIZATION_ID },
  };
}

export function softwareApplication(): JsonLd {
  return {
    "@type": "SoftwareApplication",
    "@id": APP_ID,
    name: PRODUCT_NAME,
    applicationCategory: "BusinessApplication",
    applicationSubCategory: "CRM",
    operatingSystem: "Web",
    url: absoluteUrl("/"),
    description: PRODUCT_DESCRIPTION,
    featureList: PRODUCT_FEATURES,
    inLanguage: SITE_LOCALE,
    publisher: { "@id": ORGANIZATION_ID },
  };
}

export function demoVideo(): JsonLd {
  return {
    "@type": "VideoObject",
    name: VIDEO_TITLE,
    description: VIDEO_DESCRIPTION,
    thumbnailUrl: [absoluteUrl(POSTER_SRC)],
    contentUrl: absoluteUrl(VIDEO_SRC),
    uploadDate: VIDEO_UPLOAD_DATE,
    duration: isoDuration(DURATION_LABEL),
    inLanguage: SITE_LOCALE,
    publisher: { "@id": ORGANIZATION_ID },
  };
}

export function faqPage(faqs: Faq[]): JsonLd {
  return {
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faqText(faq.answer) },
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
