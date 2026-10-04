import type { ReactNode } from "react";
import "./Tag.css";

export type TagTone = "neutral" | "accent" | "success" | "warning" | "danger" | "meli";

type TagProps = {
  tone?: TagTone;
  icon?: ReactNode;
  children: ReactNode;
};

export function Tag({ tone = "neutral", icon, children }: TagProps) {
  return (
    <span className={`tag tag-${tone}`}>
      {icon ? <span className="tag-icon">{icon}</span> : null}
      {children}
    </span>
  );
}
