import "./Meter.css";

type MeterProps = {
  value: number | null;
  size?: "sm" | "md";
};

const HEIGHT = { sm: 6, md: 10 };

export function Meter({ value, size = "sm" }: MeterProps) {
  const percent = Math.max(0, Math.min(1, value ?? 0)) * 100;
  const height = HEIGHT[size];
  return (
    <svg className="meter" width="100%" height={height} aria-hidden="true">
      <rect className="meter-track" width="100%" height={height} rx={height / 2} />
      {percent > 0 ? <rect className="meter-fill" width={`${Math.max(percent, 1.5)}%`} height={height} rx={height / 2} /> : null}
    </svg>
  );
}
