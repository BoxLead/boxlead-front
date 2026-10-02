import type { SVGProps } from "react";
import "./Logo.css";

/** BoxLead mark: a cube with an inbound arrow. Inherits `currentColor`. */
export function LogoMark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="310 280 384 460"
      fill="none"
      stroke="currentColor"
      strokeWidth={22}
      strokeLinejoin="round"
      strokeLinecap="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M502 722 398 656q-22-16-3-33l23-22 22 33 28-104H356l28 32-28 24q-28 20-28-14V402l174-104 174 104v210L502 722Z" />
      <path d="M328 402l174 103 174-103M502 505v217" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="landing-logo">
      <LogoMark className="landing-logo-mark" />
      <span className="landing-logo-text">
        <span className="landing-logo-bold">BOX</span>LEAD
      </span>
    </span>
  );
}
