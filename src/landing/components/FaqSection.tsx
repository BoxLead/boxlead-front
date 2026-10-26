import { Link } from "react-router-dom";
import { SUPPORT_EMAIL } from "../../util/company";
import { ChevronDownIcon } from "../../components/icons/UiIcons";
import { LANDING_FAQS, type Faq } from "../faq";
import "./FaqSection.css";

type FaqSectionProps = {
  faqs?: Faq[];
};

export function FaqSection({ faqs = LANDING_FAQS }: FaqSectionProps) {
  return (
    <section id="faq" className="landing-section landing-section-alt">
      <div className="landing-container">
        <div className="landing-section-head" data-reveal>
          <span className="landing-section-label">Preguntas frecuentes</span>
          <h2 className="landing-section-title">Antes de empezar</h2>
        </div>

        <div className="faq-list" data-reveal>
          {faqs.map((faq, index) => (
            <details className="faq-item" key={faq.question}>
              <summary className="faq-question">
                <span className="faq-index" aria-hidden="true">
                  0{index + 1}
                </span>
                <span className="faq-question-text">{faq.question}</span>
                <ChevronDownIcon className="faq-chevron" />
              </summary>
              <p className="faq-answer">
                {faq.answer.map((part, partIndex) =>
                  typeof part === "string" ? (
                    part
                  ) : part.to.startsWith("mailto:") ? (
                    <a href={part.to} key={partIndex}>
                      {part.label}
                    </a>
                  ) : (
                    <Link to={part.to} key={partIndex}>
                      {part.label}
                    </Link>
                  ),
                )}
              </p>
            </details>
          ))}
        </div>
        <p className="faq-more" data-reveal>
          ¿Te quedó otra duda? Escribinos a{" "}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
        </p>
      </div>
    </section>
  );
}
