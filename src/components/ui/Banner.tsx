import type { ReactNode } from "react";
import { AlertIcon, CheckIcon, InfoIcon } from "../icons/UiIcons";
import "./Banner.css";

export type BannerTone = "info" | "warning" | "danger" | "success";

type BannerProps = {
  tone?: BannerTone;
  title?: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
};

const ICONS: Record<BannerTone, ReactNode> = {
  info: <InfoIcon />,
  warning: <AlertIcon />,
  danger: <AlertIcon />,
  success: <CheckIcon />,
};

export function Banner({ tone = "info", title, children, action, className }: BannerProps) {
  return (
    <div
      className={`banner banner-${tone}${className ? ` ${className}` : ""}`}
      role={tone === "danger" ? "alert" : "status"}
    >
      <span className="banner-icon">{ICONS[tone]}</span>
      <div className="banner-body">
        {title ? <p className="banner-title">{title}</p> : null}
        {children ? <div className="banner-text">{children}</div> : null}
      </div>
      {action ? <div className="banner-action">{action}</div> : null}
    </div>
  );
}
