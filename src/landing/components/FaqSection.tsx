import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { SUPPORT_EMAIL } from "../../util/company";
import { ChevronDownIcon } from "../../components/icons/UiIcons";
import "./FaqSection.css";

type Faq = {
  question: string;
  answer: ReactNode;
};

const faqs: Faq[] = [
  {
    question: "¿El agente responde solo?",
    answer:
      "Sí. Y vos elegís cuánto delegar: puede responder en automático o dejarte un borrador para aprobar.",
  },
  {
    question: "¿Qué pasa con mis datos?",
    answer: (
      <>
        Los usamos solo para prestarte el servicio y no los vendemos. Mirá la{" "}
        <Link to="/privacy-policy">Política de privacidad</Link> o pedí la{" "}
        <Link to="/data-deletion">eliminación de tus datos</Link> cuando
        quieras.
      </>
    ),
  },
  {
    question: "¿Cómo se paga?",
    answer: "Con una suscripción mensual que incluye todos tus canales.",
  },
];

export function FaqSection() {
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
              <p className="faq-answer">{faq.answer}</p>
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
