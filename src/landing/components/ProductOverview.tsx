import { CheckIcon, CloseIcon } from "../icons/UiIcons";
import "./ProductOverview.css";

const pains = [
  "Mensajes perdidos entre aplicaciones",
  "Leads que esperan horas",
  "Para vender más, necesitás más gente",
];

const solutions = [
  "Todos tus canales en un solo lugar",
  "Respuesta en segundos, las 24 horas",
  "Más ventas con el mismo equipo",
];

export function ProductOverview() {
  return (
    <section className="landing-section">
      <div className="landing-container">
        <div className="landing-section-head" data-reveal>
          <span className="landing-section-label">El problema</span>
          <h2 className="landing-section-title">
            Si cada respuesta depende de una persona, tu negocio no escala
          </h2>
        </div>

        <div className="product-grid">
          <article
            className="product-card product-card-pain landing-card"
            data-reveal
            data-reveal-from="left"
          >
            <h3 className="product-card-title">A mano</h3>
            <ul className="product-list">
              {pains.map((item) => (
                <li key={item}>
                  <span className="product-list-icon">
                    <CloseIcon width={15} height={15} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </article>

          <article
            className="product-card product-card-solution landing-card"
            data-reveal="1"
            data-reveal-from="right"
          >
            <h3 className="product-card-title">Con BoxLead</h3>
            <ul className="product-list">
              {solutions.map((item) => (
                <li key={item}>
                  <span className="product-list-icon">
                    <CheckIcon width={15} height={15} />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </article>
        </div>
      </div>
    </section>
  );
}
