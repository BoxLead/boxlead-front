import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  InstagramIcon,
  MercadoLibreMark,
  WhatsAppIcon,
} from "../../components/icons/PlatformIcons";
import {
  ArrowRightIcon,
  BoltIcon,
  CheckIcon,
  ClockIcon,
  InboxIcon,
  MessageIcon,
  TargetIcon,
  UsersIcon,
} from "../../components/icons/UiIcons";
import { LogoMark } from "../../components/Logo/Logo";
import "./ProductOverview.css";

type Point = {
  icon: ReactNode;
  title: string;
  description: string;
};

const LEAD_ICONS: ReactNode[] = [
  <WhatsAppIcon width={20} height={20} key="whatsapp" />,
  <InstagramIcon width={20} height={20} key="instagram" />,
  <MercadoLibreMark width={22} height={22} key="meli" />,
];

const PAIN_ICONS: ReactNode[] = [
  <MessageIcon width={18} height={18} key="scattered" />,
  <ClockIcon width={18} height={18} key="waiting" />,
  <UsersIcon width={18} height={18} key="hiring" />,
];

const GAIN_ICONS: ReactNode[] = [
  <InboxIcon width={18} height={18} key="inbox" />,
  <BoltIcon width={18} height={18} key="fast" />,
  <TargetIcon width={18} height={18} key="sales" />,
];

function PointList({ points }: { points: Point[] }) {
  return (
    <ul className="problem-points">
      {points.map((point) => (
        <li className="problem-point" key={point.title}>
          <span className="problem-point-icon">{point.icon}</span>
          <span>
            <span className="problem-point-title">{point.title}</span>
            <span className="problem-point-desc">{point.description}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function ProductOverview() {
  const { t } = useTranslation("landing");
  const leads = t("problem.leads", { returnObjects: true }).map((lead, index) => ({ ...lead, icon: LEAD_ICONS[index] }));
  const pains: Point[] = t("problem.pains", { returnObjects: true }).map((point, index) => ({ ...point, icon: PAIN_ICONS[index] }));
  const gains: Point[] = t("problem.gains", { returnObjects: true }).map((point, index) => ({ ...point, icon: GAIN_ICONS[index] }));
  return (
    <section className="landing-section problem">
      <div className="landing-container">
        <div className="landing-section-head" data-reveal>
          <span className="landing-section-label">{t("problem.label")}</span>
          <h2 className="landing-section-title">{t("problem.title")}</h2>
          <p className="problem-lead">{t("problem.lead")}</p>
        </div>

        <div className="problem-compare">
          <article
            className="problem-panel problem-panel-before landing-glow"
            data-glow
            data-reveal
            data-reveal-from="left"
          >
            <header className="problem-panel-head">
              <span className="problem-panel-tag">{t("problem.beforeTag")}</span>
              <span className="problem-panel-meta">{t("problem.pending", { count: leads.length })}</span>
            </header>

            <ul className="problem-notes" aria-label={t("problem.unanswered")}>
              {leads.map((lead) => (
                <li className="problem-note" key={lead.contact}>
                  <span className="problem-channel">{lead.icon}</span>
                  <span className="problem-note-body">
                    <span className="problem-note-top">
                      <span className="problem-note-contact">{lead.contact}</span>
                      <span className="problem-note-time">{lead.waiting}</span>
                    </span>
                    <span className="problem-note-text">{lead.inbound}</span>
                  </span>
                  <span className="problem-note-state">{t("problem.unansweredState")}</span>
                </li>
              ))}
            </ul>

            <PointList points={pains} />
          </article>

          <span className="problem-bridge" aria-hidden="true">
            <ArrowRightIcon width={20} height={20} />
          </span>

          <article
            className="problem-panel problem-panel-after landing-glow"
            data-glow
            data-reveal="1"
            data-reveal-from="right"
          >
            <header className="problem-panel-head">
              <span className="problem-panel-tag">
                <LogoMark width={16} height={16} />
                {t("problem.afterTag")}
              </span>
              <span className="problem-panel-meta problem-panel-meta-live">
                <span className="problem-live-dot" />
                {t("problem.working")}
              </span>
            </header>

            <ul className="problem-inbox" aria-label={t("problem.answered")}>
              {leads.map((lead) => (
                <li className="problem-row" key={lead.contact}>
                  <span className="problem-channel">{lead.icon}</span>
                  <span className="problem-row-body">
                    <span className="problem-row-contact">{lead.contact}</span>
                    <span className="problem-row-reply">
                      <CheckIcon width={13} height={13} />
                      <span>{lead.reply}</span>
                    </span>
                  </span>
                  <span className="problem-row-outcome">{lead.outcome}</span>
                </li>
              ))}
            </ul>

            <PointList points={gains} />
          </article>
        </div>
      </div>
    </section>
  );
}
