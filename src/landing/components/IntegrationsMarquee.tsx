import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  WhatsAppIcon,
  InstagramIcon,
  MessengerIcon,
  MercadoLibreMark,
  TikTokIcon,
  LinkedInIcon,
  GoogleAdsIcon,
} from "../../components/icons/PlatformIcons";
import "./IntegrationsMarquee.css";

type Platform = {
  name: string;
  icon: ReactNode;
  to?: string;
};

const ICON_SIZE = 22;

const platforms: Platform[] = [
  {
    name: "WhatsApp",
    icon: <WhatsAppIcon width={ICON_SIZE} height={ICON_SIZE} />,
    to: "/whatsapp",
  },
  {
    name: "Instagram",
    icon: <InstagramIcon width={ICON_SIZE} height={ICON_SIZE} />,
    to: "/instagram",
  },
  {
    name: "Messenger",
    icon: <MessengerIcon width={ICON_SIZE} height={ICON_SIZE} />,
    to: "/messenger",
  },
  {
    name: "MercadoLibre",
    icon: <MercadoLibreMark width={ICON_SIZE} height={ICON_SIZE} />,
    to: "/mercadolibre",
  },
  { name: "TikTok", icon: <TikTokIcon width={ICON_SIZE} height={ICON_SIZE} /> },
  {
    name: "LinkedIn",
    icon: <LinkedInIcon width={ICON_SIZE} height={ICON_SIZE} />,
  },
  {
    name: "Google Ads",
    icon: <GoogleAdsIcon width={ICON_SIZE} height={ICON_SIZE} />,
  },
];

function MarqueeGroup({ hidden = false }: { hidden?: boolean }) {
  return (
    <ul className="marquee-group" aria-hidden={hidden || undefined}>
      {platforms.map((platform) => (
        <li className="marquee-item" key={platform.name}>
          {platform.to && !hidden ? (
            <Link to={platform.to} className="marquee-link">
              {platform.icon}
              <span>{platform.name}</span>
            </Link>
          ) : (
            <>
              {platform.icon}
              <span>{platform.name}</span>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}

export function IntegrationsMarquee() {
  return (
    <section className="marquee-section" aria-labelledby="marquee-label">
      <p className="marquee-label" id="marquee-label">
        Conectado con las plataformas donde están tus clientes
      </p>
      <div className="marquee-viewport">
        <div className="marquee-track">
          <MarqueeGroup />
          <MarqueeGroup hidden />
        </div>
      </div>
    </section>
  );
}
