import "./Sparkline.css";

type SparklineProps = {
  values: number[];
};

const WIDTH = 120;
const HEIGHT = 32;

export function Sparkline({ values }: SparklineProps) {
  if (values.length < 2) return null;
  const max = Math.max(...values);
  const min = Math.min(...values);
  const span = max - min || 1;
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * WIDTH;
    const y = HEIGHT - 3 - ((value - min) / span) * (HEIGHT - 6);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const last = points[points.length - 1].split(",");
  return (
    <svg className="sparkline" viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" aria-hidden="true">
      <polygon className="sparkline-area" points={`0,${HEIGHT} ${points.join(" ")} ${WIDTH},${HEIGHT}`} />
      <polyline className="sparkline-line" points={points.join(" ")} vectorEffect="non-scaling-stroke" />
      <circle className="sparkline-dot" cx={last[0]} cy={last[1]} r={2.5} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
