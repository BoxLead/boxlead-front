import { i18n } from "../i18n";
import type { Language } from "../i18n/languages";

export type Faq = { question: string; answer: string };

export function landingFaqs(language: Language): Faq[] {
  return i18n.getFixedT(language, "landing")("faq.items", { returnObjects: true });
}
