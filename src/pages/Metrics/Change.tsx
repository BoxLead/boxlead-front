import { formatPoints, formatSignedPercent } from "../../util/format";
import "./Change.css";

type ChangeProps = {
  value: number | null;
  kind: "percent" | "points";
  better?: "up" | "down";
};

const FLAT = 0.005;

export function Change({ value, kind, better = "up" }: ChangeProps) {
  if (value === null || !Number.isFinite(value)) return <span className="change change-flat">—</span>;
  if (Math.abs(value) < FLAT) return <span className="change change-flat">Sin cambio</span>;
  const improved = better === "up" ? value > 0 : value < 0;
  return (
    <span className={improved ? "change change-good" : "change change-bad"}>
      {kind === "points" ? formatPoints(value) : formatSignedPercent(value)}
      <span className="visually-hidden"> contra el período anterior</span>
    </span>
  );
}
