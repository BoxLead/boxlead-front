import { i18n } from "../i18n";
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
    title: "Botón de arrepentimiento",
    description: "Arrepentite de un plan pago de BoxLead dentro de los 10 días corridos del primer cobro y recibí la devolución total, sin iniciar sesión.",
    lang: "es-AR",
    index: false,
    source: "src/pages/ConsumerRequest/Withdrawal.tsx",
  }),
  page({
    path: "/baja",
    title: "Botón de baja de servicio",
    description: "Pedí la baja de tu suscripción a BoxLead sin iniciar sesión, sin costo y sin preaviso.",
    lang: "es-AR",
    index: false,
    source: "src/pages/ConsumerRequest/Cancellation.tsx",
  }),
  page({
    path: "/login",
    title: "Iniciar sesión",
    description: "Ingresá a tu cuenta de BoxLead.",
    lang: "es-AR",
    index: false,
    source: "src/pages/Login/Login.tsx",
  }),
  page({
    path: "/register",
    title: "Crear cuenta",
    description: "Creá tu cuenta de BoxLead y conectá tus canales en minutos.",
    lang: "es-AR",
    index: false,
    source: "src/pages/Register/Register.tsx",
  }),
  page({
    path: "/invitacion",
    title: "Invitación",
    description: "Activá tu invitación a la Beta de BoxLead.",
    lang: "es-AR",
    index: false,
    source: "src/pages/Invitation/Invitation.tsx",
  }),
  page({
    path: "/recuperar-clave",
    title: "Recuperar la contraseña",
    description: "Pedí un link para elegir una contraseña nueva para tu cuenta de BoxLead.",
    lang: "es-AR",
    index: false,
    source: "src/pages/PasswordRecovery/ForgotPassword.tsx",
  }),
  page({
    path: "/nueva-clave",
    title: "Elegir una contraseña nueva",
    description: "Elegí una contraseña nueva para tu cuenta de BoxLead.",
    lang: "es-AR",
    index: false,
    source: "src/pages/PasswordRecovery/ResetPassword.tsx",
  }),
  page({
    path: "/confirmar-email",
    title: "Confirmar tu email",
    description: "Confirmá el email de tu cuenta de BoxLead.",
    lang: "es-AR",
    index: false,
    source: "src/pages/EmailVerification/ConfirmEmail.tsx",
  }),
  page({
    path: "/nuevo-email",
    title: "Confirmar el email nuevo",
    description: "Confirmá el email nuevo de tu cuenta de BoxLead.",
    lang: "es-AR",
    index: false,
    source: "src/pages/EmailChange/ConfirmEmailChange.tsx",
  }),
  page({
    path: "/reingresar",
    title: "Confirmá que sos vos",
    description: "Volvé a entrar con tu proveedor para confirmar un cambio en tu cuenta de BoxLead.",
    lang: "es-AR",
    index: false,
    source: "src/pages/Reauthenticate/Reauthenticate.tsx",
  }),
  page({
    path: "/social/callback",
    title: "Iniciando sesión",
    description: "Estamos verificando tu cuenta.",
    lang: "es-AR",
    index: false,
    source: "src/pages/SocialCallback/SocialCallback.tsx",
  }),
  page({
    path: "/avisos/baja",
    title: "Dejar de recibir avisos",
    description: "Dejá de recibir los mails de avisos de BoxLead desde el enlace del último mail.",
    lang: "es-AR",
    index: false,
    source: "src/pages/NotificationUnsubscribe/NotificationUnsubscribe.tsx",
  }),
];

export const NOT_FOUND_PAGE: PublicPage = {
  path: "/404",
  title: "Página no encontrada",
  description: "El enlace puede estar mal escrito o la página ya no existe.",
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
