import "./KineticBand.css";

const actions = ["Lee", "Responde", "Califica", "Ordena"];
const channels = ["WhatsApp", "Instagram", "Messenger", "MercadoLibre"];

function Row({ words, hidden = false }: { words: string[]; hidden?: boolean }) {
  return (
    <span className="kinetic-group" aria-hidden={hidden || undefined}>
      {words.map((word) => (
        <span className="kinetic-word" key={word}>
          {word}
          <span className="kinetic-dot" aria-hidden="true" />
        </span>
      ))}
    </span>
  );
}

export function KineticBand() {
  return (
    <section className="kinetic" aria-label="Lo que hace tu agente en cada canal">
      <p className="kinetic-row kinetic-row-main">
        <span className="kinetic-track">
          <Row words={actions} />
          <Row words={actions} hidden />
        </span>
      </p>
      <p className="kinetic-row kinetic-row-sub">
        <span className="kinetic-track">
          <Row words={channels} />
          <Row words={channels} hidden />
        </span>
      </p>
    </section>
  );
}
