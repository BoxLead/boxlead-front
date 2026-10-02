import type { ReactNode } from "react";
import type { PlatformType } from "../../api/types";
import { platformLabel } from "../../util/labels";
import {
  GoogleAdsIcon,
  InstagramIcon,
  MercadoLibreIcon,
  MessengerIcon,
  TikTokIcon,
  WhatsAppIcon,
} from "../icons/PlatformIcons";
import "./PlatformBadge.css";

const ICON_SIZE = 16;

const ICONS: Record<PlatformType, ReactNode> = {
  META: <MessengerIcon width={ICON_SIZE} height={ICON_SIZE} />,
  INSTAGRAM: <InstagramIcon width={ICON_SIZE} height={ICON_SIZE} />,
  WHATSAPP: <WhatsAppIcon width={ICON_SIZE} height={ICON_SIZE} />,
  MELI: <MercadoLibreIcon width={ICON_SIZE} height={ICON_SIZE} />,
  TIKTOK: <TikTokIcon width={ICON_SIZE} height={ICON_SIZE} />,
  GOOGLE_ADS: <GoogleAdsIcon width={ICON_SIZE} height={ICON_SIZE} />,
};

type PlatformBadgeProps = {
  platform: PlatformType;
  iconOnly?: boolean;
};

export function PlatformBadge({
  platform,
  iconOnly = false,
}: PlatformBadgeProps) {
  const label = platformLabel(platform);

  if (iconOnly) {
    return (
      <span className="platform-badge platform-badge-icon" title={label}>
        {ICONS[platform]}
        <span className="visually-hidden">{label}</span>
      </span>
    );
  }

  return (
    <span className="platform-badge">
      {ICONS[platform]}
      {label}
    </span>
  );
}
