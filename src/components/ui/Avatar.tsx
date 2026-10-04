import type { PlatformType } from "../../api/types";
import { getPlatform } from "../../platforms";
import { hueOf, initialsOf } from "./initials";
import "./Avatar.css";

type AvatarProps = {
  name: string;
  platform?: PlatformType;
  size?: "sm" | "md" | "lg";
};

export function Avatar({ name, platform, size = "md" }: AvatarProps) {
  return (
    <span className={`avatar avatar-${size} avatar-hue-${hueOf(name)}`} aria-hidden="true">
      {initialsOf(name)}
      {platform ? <span className="avatar-platform">{getPlatform(platform).logo(14)}</span> : null}
    </span>
  );
}
