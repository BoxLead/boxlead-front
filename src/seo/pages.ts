import { i18n } from "../i18n";
import type { pages as seoPages } from "../i18n/messages/es/seo.json";
import { HTML_LANG, languageOfHtmlLang, LANGUAGES, type HtmlLang, type Language } from "../i18n/languages";
import { localizedPath } from "../i18n/paths";
import { editorialPages } from "../landing/editorial";
import { landingFaqs } from "../landing/faq";
import { PRODUCT_NAME } from "../util/company";
import { normalizePath } from "./site";
import { breadcrumbs, demoVideo, faqPage, organization, softwareApplication, webPage, webSite, type JsonLd } from "./structuredData";

export type PageLanguage = HtmlLang;

export type Alternate = { lang: PageLanguage; path: string };

export type PublicPage = {
  path: string;
  title: string;
  description: string;
  lang: PageLanguage;
  index: boolean;
  image?: string;
  imageAlt?: string;
  alternates?: Alternate[];
  changefreq?: "weekly" | "monthly" | "yearly";
  priority?: number;
  source: string;
  followsPreference?: boolean;
  messageKey?: PreferencePageKey;
  jsonLd?: () => Record<string, unknown>[];
};

const LEGAL_ALTERNATES = {
  terms: [
    { lang: "es-AR", path: "/terminos" },
    { lang: "en", path: "/terms-of-service" },
  ],
  privacy: [
    { lang: "es-AR", path: "/privacidad" },
    { lang: "en", path: "/privacy-policy" },
  ],
} satisfies Record<string, Alternate[]>;

function translations(basePath: string): Alternate[] {
  return LANGUAGES.map((language) => ({ lang: HTML_LANG[language], path: localizedPath(basePath, language) }));
}

function homePage(language: Language): PublicPage {
  const t = i18n.getFixedT(language, "seo");
  const lang = HTML_LANG[language];
  return {
    jsonLd: () => [organization(), webSite(language), softwareApplication(language), demoVideo(language), faqPage(landingFaqs(language))],
    path: localizedPath("/", language),
    title: t("home.title"),
    description: t("home.description"),
    lang,
    index: true,
    alternates: translations("/"),
    changefreq: "weekly",
    priority: language === "es" ? 1 : 0.9,
    source: "src/landing",
  };
}

function channelPages(language: Language): PublicPage[] {
  const home = i18n.getFixedT(language, "seo")("breadcrumbHome");
  const lang = HTML_LANG[language];
  return editorialPages(language).map((page) => ({
    path: page.path,
    title: page.title,
    description: page.description,
    lang,
    index: true,
    image: `/og/${page.slug}.png`,
    imageAlt: page.heading,
    alternates: translations(page.basePath),
    changefreq: "monthly",
    priority: language === "es" ? 0.8 : 0.7,
    source: `src/i18n/messages/${language}/channels.json`,
    jsonLd: () => [
      webPage(page.path, page.title, page.description, lang),
      breadcrumbs([{ name: home, path: localizedPath("/", language) }, { name: page.label, path: page.path }]),
      faqPage(page.faqs),
    ],
  }));
}

function legalPage(path: string, title: string, description: string, lang: PageLanguage): () => JsonLd[] {
  const language = languageOfHtmlLang(lang);
  const home = i18n.getFixedT(language, "seo")("breadcrumbHome");
  return () => [webPage(path, title, description, lang), breadcrumbs([{ name: home, path: localizedPath("/", language) }, { name: title, path }])];
}

function page(definition: Omit<PublicPage, "jsonLd">): PublicPage {
  return definition.index ? { ...definition, jsonLd: legalPage(definition.path, definition.title, definition.description, definition.lang) } : definition;
}

type PreferencePageKey = keyof typeof seoPages;

function preferenceCopy(key: PreferencePageKey): Pick<PublicPage, "title" | "description" | "messageKey"> {
  const t = i18n.getFixedT("es", "seo");
  return { title: t(`pages.${key}.title`), description: t(`pages.${key}.description`), messageKey: key };
}

export const PUBLIC_PAGES: PublicPage[] = [
  homePage("es"),
  homePage("en"),
  ...channelPages("es"),
  ...channelPages("en"),
  page({
    path: "/terminos",
    title: "Términos y condiciones",
    description: "Las condiciones de uso de BoxLead, el servicio de Catvin SRL. Planes, pagos, baja, arrepentimiento y tus derechos como consumidor.",
    lang: "es-AR",
    index: true,
    alternates: LEGAL_ALTERNATES.terms,
    changefreq: "monthly",
    priority: 0.3,
    source: "src/pages/Legal/Terms.tsx",
  }),
  page({
    path: "/privacidad",
    title: "Política de privacidad",
    description: "Qué datos personales trata BoxLead, para qué, con quién los comparte y cómo ejercer tus derechos según la Ley 25.326.",
    lang: "es-AR",
    index: true,
    alternates: LEGAL_ALTERNATES.privacy,
    changefreq: "monthly",
    priority: 0.3,
    source: "src/pages/Legal/Privacy.tsx",
  }),
  page({
    path: "/contratos",
    title: "Contratos de adhesión Ley N° 24.240 de Defensa del Consumidor",
    description: "El modelo de contrato de adhesión para la suscripción a BoxLead, publicado según el artículo 38 de la Ley 24.240.",
    lang: "es-AR",
    index: true,
    changefreq: "monthly",
    priority: 0.3,
    source: "src/pages/Legal/AdhesionContracts.tsx",
  }),
  page({
    path: "/terms-of-service",
    title: "Terms of Service",
    description: "The terms of use of BoxLead, the service provided by Catvin SRL. An English translation for reference, the Spanish version prevails.",
    lang: "en",
    index: true,
    alternates: LEGAL_ALTERNATES.terms,
    changefreq: "monthly",
    priority: 0.2,
    source: "src/pages/Legal/TermsOfService.tsx",
  }),
  page({
    path: "/privacy-policy",
    title: "Privacy Policy",
    description: "What data BoxLead collects through the Meta Graph API, how it is used, shared and deleted. An English translation for reference.",
    lang: "en",
    index: true,
    alternates: LEGAL_ALTERNATES.privacy,
    changefreq: "monthly",
    priority: 0.2,
    source: "src/pages/Legal/PrivacyPolicy.tsx",
  }),
  page({
    path: "/data-deletion",
    title: "Data Deletion Instructions",
    description: "How to remove the BoxLead integration from Facebook and request the complete erasure of your leads, conversations and messages.",
    lang: "en",
    index: true,
    changefreq: "yearly",
    priority: 0.2,
    source: "src/pages/Legal/DataDeletion.tsx",
  }),
  page({
    path: "/arrepentimiento",
    followsPreference: true,
    ...preferenceCopy("withdrawal"),
    lang: "es-AR",
    index: false,
    source: "src/pages/ConsumerRequest/Withdrawal.tsx",
  }),
  page({
    path: "/baja",
    followsPreference: true,
    ...preferenceCopy("cancellation"),
    lang: "es-AR",
    index: false,
    source: "src/pages/ConsumerRequest/Cancellation.tsx",
  }),
  page({
    path: "/login",
    followsPreference: true,
    ...preferenceCopy("login"),
    lang: "es-AR",
    index: false,
    source: "src/pages/Login/Login.tsx",
  }),
  page({
    path: "/register",
    followsPreference: true,
    ...preferenceCopy("register"),
    lang: "es-AR",
    index: false,
    source: "src/pages/Register/Register.tsx",
  }),
  page({
    path: "/invitacion",
    followsPreference: true,
    ...preferenceCopy("invitation"),
    lang: "es-AR",
    index: false,
    source: "src/pages/Invitation/Invitation.tsx",
  }),
  page({
    path: "/recuperar-clave",
    followsPreference: true,
    ...preferenceCopy("forgot"),
    lang: "es-AR",
    index: false,
    source: "src/pages/PasswordRecovery/ForgotPassword.tsx",
  }),
  page({
    path: "/nueva-clave",
    followsPreference: true,
    ...preferenceCopy("reset"),
    lang: "es-AR",
    index: false,
    source: "src/pages/PasswordRecovery/ResetPassword.tsx",
  }),
  page({
    path: "/confirmar-email",
    followsPreference: true,
    ...preferenceCopy("confirmEmail"),
    lang: "es-AR",
    index: false,
    source: "src/pages/EmailVerification/ConfirmEmail.tsx",
  }),
  page({
    path: "/nuevo-email",
    followsPreference: true,
    ...preferenceCopy("newEmail"),
    lang: "es-AR",
    index: false,
    source: "src/pages/EmailChange/ConfirmEmailChange.tsx",
  }),
  page({
    path: "/reingresar",
    followsPreference: true,
    ...preferenceCopy("reauth"),
    lang: "es-AR",
    index: false,
    source: "src/pages/Reauthenticate/Reauthenticate.tsx",
  }),
  page({
    path: "/social/callback",
    followsPreference: true,
    ...preferenceCopy("socialCallback"),
    lang: "es-AR",
    index: false,
    source: "src/pages/SocialCallback/SocialCallback.tsx",
  }),
  page({
    path: "/avisos/baja",
    followsPreference: true,
    ...preferenceCopy("unsubscribe"),
    lang: "es-AR",
    index: false,
    source: "src/pages/NotificationUnsubscribe/NotificationUnsubscribe.tsx",
  }),
];

export const NOT_FOUND_PAGE: PublicPage = {
  path: "/404",
  followsPreference: true,
  ...preferenceCopy("notFound"),
  lang: "es-AR",
  index: false,
  source: "src/routing/NotFound.tsx",
};

export const APP_SHELL_PATH = "/app";

const byPath = new Map(PUBLIC_PAGES.map((page) => [page.path, page]));

export function pageFor(pathname: string): PublicPage | null {
  const path = normalizePath(pathname);
  const page = byPath.get(path);
  if (page) return page;
  if (path === APP_SHELL_PATH || path.startsWith(`${APP_SHELL_PATH}/`) || path === "/__ui") return null;
  return NOT_FOUND_PAGE;
}

export function pageTitle(page: PublicPage): string {
  return `${page.title} · ${PRODUCT_NAME}`;
}
