import { useTranslation } from "react-i18next";
import { intlLocale } from "../../i18n/locale";
import "./KineticBand.css";

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
  const { t } = useTranslation("landing");
  const actions = t("kinetic.actions", { returnObjects: true });
  return (
    <section className="kinetic" aria-label={t("kinetic.label")}>
      <p className="visually-hidden">
        {t("kinetic.summary", { actions: actions.join(", ").toLocaleLowerCase(intlLocale()), channels: channels.join(", ") })}
      </p>
      <p className="kinetic-row kinetic-row-main" aria-hidden="true">
        <span className="kinetic-track">
          <Row words={actions} />
          <Row words={actions} hidden />
        </span>
      </p>
      <p className="kinetic-row kinetic-row-sub" aria-hidden="true">
        <span className="kinetic-track">
          <Row words={channels} />
          <Row words={channels} hidden />
        </span>
      </p>
    </section>
  );
}
