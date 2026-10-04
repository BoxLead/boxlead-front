import type { PlatformType } from "../../api/types";
import { getPlatform } from "../../platforms";
import "./PlatformBadge.css";

const ICON_SIZE = 16;

type PlatformBadgeProps = {
  platform: PlatformType;
  iconOnly?: boolean;
};

export function PlatformBadge({
  platform,
  iconOnly = false,
}: PlatformBadgeProps) {
  const { name, logo } = getPlatform(platform);

  if (iconOnly) {
    return (
      <span className="platform-badge platform-badge-icon" title={name}>
        {logo(ICON_SIZE)}
        <span className="visually-hidden">{name}</span>
      </span>
    );
  }

  return (
    <span className="platform-badge">
      {logo(ICON_SIZE)}
      {name}
    </span>
  );
}
