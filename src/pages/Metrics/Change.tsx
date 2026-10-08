import { formatPoints, formatSignedPercent } from "../../util/format";
import "./Change.css";

type ChangeProps = {
  value: number | null;
  kind: "percent" | "points";
};

export function Change({ value, kind }: ChangeProps) {
  if (value === null || !Number.isFinite(value)) return <span className="change change-flat">—</span>;
  const flat = Math.abs(value) < (kind === "points" ? 0.005 : 0.005);
  const text = kind === "points" ? formatPoints(value) : formatSignedPercent(value);
  return (
    <span className={`change ${flat ? "change-flat" : value > 0 ? "change-up" : "change-down"}`}>
      {flat ? "Sin cambio" : text}
      <span className="visually-hidden"> contra el período anterior</span>
    </span>
  );
}
