import type { ReactNode } from "react";
export type Illustration = "inbox" | "leads" | "search" | "agents" | "categories" | "connections" | "metrics" | "missing";

type Props = { kind: Illustration };

function Frame({ children }: { children: ReactNode }) {
  return (
    <svg className="empty-illustration" viewBox="0 0 160 112" width={160} height={112} aria-hidden="true" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <defs>
        <linearGradient id="empty-glow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.18" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <ellipse className="empty-illustration-glow" cx="80" cy="60" rx="72" ry="40" fill="url(#empty-glow)" />
      {children}
    </svg>
  );
}

export function EmptyIllustration({ kind }: Props) {
  if (kind === "inbox") {
    return (
      <Frame>
        <rect className="empty-card" x="34" y="30" width="78" height="40" rx="12" />
        <path className="empty-line" d="M48 44h36M48 54h22" />
        <rect className="empty-card empty-card-accent" x="62" y="54" width="66" height="34" rx="12" />
        <path className="empty-line empty-line-accent" d="M76 66h30M76 76h18" />
      </Frame>
    );
  }
  if (kind === "leads") {
    return (
      <Frame>
        <circle className="empty-card" cx="52" cy="46" r="14" />
        <path className="empty-card" d="M30 86c0-14 10-22 22-22s22 8 22 22" />
        <circle className="empty-card empty-card-accent" cx="100" cy="42" r="16" />
        <path className="empty-card empty-card-accent" d="M74 88c0-16 12-26 26-26s26 10 26 26" />
      </Frame>
    );
  }
  if (kind === "search") {
    return (
      <Frame>
        <path className="empty-line" d="M36 38h40M36 52h28M36 66h34M36 80h20" />
        <circle className="empty-card empty-card-accent" cx="104" cy="56" r="18" />
        <path className="empty-line empty-line-accent" d="M117 69l14 14" strokeWidth="3" />
      </Frame>
    );
  }
  if (kind === "agents") {
    return (
      <Frame>
        <rect className="empty-card" x="46" y="40" width="68" height="46" rx="14" />
        <circle className="empty-dot" cx="68" cy="62" r="4" />
        <circle className="empty-dot" cx="92" cy="62" r="4" />
        <path className="empty-line" d="M70 74c5 4 15 4 20 0" />
        <path className="empty-line empty-line-accent" d="M80 40V30M72 26l8-8 8 8" />
        <path className="empty-line empty-line-accent" d="M120 50l4-10 4 10 10 4-10 4-4 10-4-10-10-4Z" />
      </Frame>
    );
  }
  if (kind === "categories") {
    return (
      <Frame>
        <path className="empty-card" d="M40 44l24-10 26 26-24 24-26-26z" />
        <circle className="empty-dot" cx="52" cy="46" r="3" />
        <path className="empty-card empty-card-accent" d="M78 34l26-6 20 28-20 26-28-18z" />
        <circle className="empty-dot empty-dot-accent" cx="94" cy="42" r="3" />
      </Frame>
    );
  }
  if (kind === "connections") {
    return (
      <Frame>
        <rect className="empty-card" x="30" y="44" width="36" height="28" rx="8" />
        <path className="empty-line" d="M42 44V34M54 44V34" />
        <path className="empty-line empty-line-accent" d="M66 58h14" strokeDasharray="3 5" />
        <rect className="empty-card empty-card-accent" x="94" y="44" width="36" height="28" rx="8" />
        <path className="empty-line empty-line-accent" d="M130 58h8" />
      </Frame>
    );
  }
  if (kind === "metrics") {
    return (
      <Frame>
        <path className="empty-line" d="M34 86h92" />
        <rect className="empty-card" x="44" y="62" width="14" height="24" rx="4" />
        <rect className="empty-card" x="68" y="50" width="14" height="36" rx="4" />
        <rect className="empty-card empty-card-accent" x="92" y="36" width="14" height="50" rx="4" />
        <path className="empty-line empty-line-accent" d="M44 52l24-10 24-6 24-12" strokeDasharray="3 4" />
      </Frame>
    );
  }
  return (
    <Frame>
      <rect className="empty-card" x="48" y="30" width="64" height="54" rx="14" />
      <path className="empty-line" d="M64 50h32M64 62h20" />
      <circle className="empty-dot empty-dot-accent" cx="104" cy="78" r="12" />
      <path className="empty-line empty-line-contrast" d="M104 73v6M104 83v.5" strokeWidth="2.5" />
    </Frame>
  );
}
