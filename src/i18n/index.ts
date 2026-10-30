import i18n, { type BackendModule, type ResourceKey } from "i18next";
import { initReactI18next } from "react-i18next";
import { DEFAULT_LANGUAGE, isLanguage, LANGUAGES } from "./languages";
import { setCurrentLanguage } from "./locale";

type MessageModule = { default: ResourceKey };

export const BUNDLED_NAMESPACES = ["common", "landing", "channels", "seo"] as const;

const bundled = import.meta.glob<MessageModule>("./messages/*/{common,landing,channels,seo}.json", { eager: true });
const lazy = import.meta.glob<MessageModule>(["./messages/*/*.json", "!./messages/*/{common,landing,channels,seo}.json"]);

function messageFile(language: string, namespace: string): string {
  return `./messages/${language}/${namespace}.json`;
}

const resources = Object.fromEntries(
  LANGUAGES.map((language) => [
    language,
    Object.fromEntries(BUNDLED_NAMESPACES.map((namespace) => [namespace, bundled[messageFile(language, namespace)]?.default ?? {}])),
  ]),
);

export const LAZY_NAMESPACES = [...new Set(Object.keys(lazy).map((file) => file.split("/").at(-1)?.replace(/\.json$/, "") ?? ""))].filter(Boolean);

const lazyMessages: BackendModule = {
  type: "backend",
  init() {},
  read(language, namespace, callback) {
    const load = lazy[messageFile(language, namespace)];
    if (!load) {
      callback(null, {});
      return;
    }
    load().then(
      (module) => callback(null, module.default),
      (error: unknown) => callback(error instanceof Error ? error : new Error(String(error)), null),
    );
  },
};

void i18n
  .use(lazyMessages)
  .use(initReactI18next)
  .init({
    resources,
    partialBundledLanguages: true,
    lng: DEFAULT_LANGUAGE,
    fallbackLng: false,
    supportedLngs: LANGUAGES,
    ns: [...BUNDLED_NAMESPACES],
    defaultNS: "common",
    interpolation: { escapeValue: false },
    initAsync: false,
    returnNull: false,
  });

i18n.on("languageChanged", (language) => {
  if (isLanguage(language)) setCurrentLanguage(language);
});

export function messages(namespace: string): { preload: () => Promise<void> } {
  return { preload: () => i18n.loadNamespaces(namespace).then(() => undefined) };
}

export { i18n };
