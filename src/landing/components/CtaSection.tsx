import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { trackEvent } from "../../analytics/gtag";
import { SUPPORT_EMAIL } from "../../util/company";
import {
  InstagramIcon,
  MercadoLibreMark,
  MessengerIcon,
  WhatsAppIcon,
} from "../../components/icons/PlatformIcons";
import { ArrowRightIcon, CheckIcon } from "../../components/icons/UiIcons";
import { useLocalizedPath } from "../../i18n/useLanguage";
import { RollText } from "./RollText";
import "./CtaSection.css";

const ICON_SIZE = 20;

const ACTIVITY_ICONS: ReactNode[] = [
  <WhatsAppIcon width={ICON_SIZE} height={ICON_SIZE} key="stock" />,
  <InstagramIcon width={ICON_SIZE} height={ICON_SIZE} key="comment" />,
  <MercadoLibreMark width={ICON_SIZE} height={ICON_SIZE} key="invoice" />,
  <MessengerIcon width={ICON_SIZE} height={ICON_SIZE} key="prices" />,
  <WhatsAppIcon width={ICON_SIZE} height={ICON_SIZE} key="shipping" />,
];

function ActivityGroup({ hidden = false }: { hidden?: boolean }) {
  const { t } = useTranslation("landing");
  const activity = t("cta.activity", { returnObjects: true }).map((item, index) => ({ ...item, icon: ACTIVITY_ICONS[index] }));
  return (
    <ul className="cta-feed-group" aria-hidden={hidden || undefined}>
      {activity.map((item) => (
        <li className="cta-feed-item" key={item.title}>
          <span className="cta-feed-icon">{item.icon}</span>
          <span className="cta-feed-body">
            <span className="cta-feed-title">{item.title}</span>
            <span className="cta-feed-result">
              <CheckIcon width={14} height={14} />
              {item.result}
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function CtaSection() {
  const { t } = useTranslation("landing");
  const localized = useLocalizedPath();
  return (
    <section className="landing-section">
      <div className="landing-container">
        <div className="cta-card landing-glow" data-glow>
          <div>
            <h2 className="cta-title">{t("cta.title")}</h2>
            <p className="cta-subtitle">{t("cta.subtitle")}</p>
            <div className="cta-actions">
              <Link
                to={localized("/register")}
                className="landing-btn landing-btn-primary landing-btn-lg"
                onClick={() => trackEvent("cta_registro", { ubicacion: "cierre" })}
              >
                <RollText>{t("actions.start")}</RollText>
                <ArrowRightIcon width={18} height={18} />
              </Link>
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="landing-btn landing-btn-secondary landing-btn-lg"
                onClick={() => trackEvent("contacto", { ubicacion: "cierre" })}
              >
                <RollText>{t("actions.talkToUs")}</RollText>
              </a>
            </div>
            <p className="cta-note">{t("cta.note")}</p>
          </div>

          <div className="cta-feed">
            <div className="cta-feed-head">
              <span>{t("cta.feedHead")}</span>
              <span className="cta-feed-live">
                <span className="cta-feed-live-dot" />
                {t("cta.live")}
              </span>
            </div>
            <div className="cta-feed-viewport">
              <div className="cta-feed-track">
                <ActivityGroup />
                <ActivityGroup hidden />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
