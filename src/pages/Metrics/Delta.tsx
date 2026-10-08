import { formatPoints, formatSignedPercent } from "../../util/format";
import "./Delta.css";

type DeltaProps = {
  value: number | null;
  kind?: "percent" | "points";
  better?: "up" | "down";
};

export function Delta({ value, kind = "percent", better = "up" }: DeltaProps) {
  if (value === null || !Number.isFinite(value)) return null;
  const flat = Math.abs(value) < (kind === "points" ? 0.005 : 0.01);
  const improved = better === "up" ? value > 0 : value < 0;
  const tone = flat ? "flat" : improved ? "good" : "bad";
  const text = kind === "points" ? formatPoints(value) : formatSignedPercent(value);
  return (
    <span className={`delta delta-${tone}`}>
      <span aria-hidden="true">{flat ? "=" : value > 0 ? "↑" : "↓"}</span>
      {flat ? "Sin cambios" : text.replace(/^[+-]/, "")}
      <span className="visually-hidden">
        {flat ? "" : value > 0 ? " más" : " menos"} que en el período anterior
      </span>
    </span>
  );
}
