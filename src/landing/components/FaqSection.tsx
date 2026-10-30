import { useTranslation } from "react-i18next";
import { trackEvent } from "../../analytics/gtag";
import { SUPPORT_EMAIL } from "../../util/company";
import { ChevronDownIcon } from "../../components/icons/UiIcons";
import { RichText } from "../../i18n/RichText";
import { useLanguage } from "../../i18n/useLanguage";
import { landingFaqs, type Faq } from "../faq";
import "./FaqSection.css";

type FaqSectionProps = {
  faqs?: Faq[];
};

export function FaqSection({ faqs }: FaqSectionProps) {
  const { t } = useTranslation("landing");
  const language = useLanguage();
  const items = faqs ?? landingFaqs(language);
  return (
    <section id="faq" className="landing-section landing-section-alt">
      <div className="landing-container">
        <div className="landing-section-head" data-reveal>
          <span className="landing-section-label">{t("faq.label")}</span>
          <h2 className="landing-section-title">{t("faq.title")}</h2>
        </div>

        <div className="faq-list" data-reveal>
          {items.map((faq, index) => (
            <details className="faq-item" key={faq.question}>
              <summary className="faq-question">
                <span className="faq-index" aria-hidden="true">
                  0{index + 1}
                </span>
                <span className="faq-question-text">{faq.question}</span>
                <ChevronDownIcon className="faq-chevron" />
              </summary>
              <p className="faq-answer">
                <RichText text={faq.answer} />
              </p>
            </details>
          ))}
        </div>
        <p className="faq-more" data-reveal>
          {t("faq.more")}{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`} onClick={() => trackEvent("contacto", { ubicacion: "preguntas" })}>
            {SUPPORT_EMAIL}
          </a>
        </p>
      </div>
    </section>
  );
}
