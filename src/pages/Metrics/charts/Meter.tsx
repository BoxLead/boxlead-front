import "./Meter.css";

type MeterProps = {
  value: number | null;
  colorClass?: string;
  size?: "sm" | "md";
};

export function Meter({ value, colorClass, size = "sm" }: MeterProps) {
  const percent = Math.max(0, Math.min(1, value ?? 0)) * 100;
  const height = size === "sm" ? 6 : 10;
  return (
    <svg className={`meter${colorClass ? ` ${colorClass}` : ""}`} width="100%" height={height} aria-hidden="true">
      <rect className="meter-track" width="100%" height={height} rx={height / 2} />
      {percent > 0 ? (
        <rect className="meter-fill" width={`${Math.max(percent, 1.5)}%`} height={height} rx={height / 2} />
      ) : null}
    </svg>
  );
}
