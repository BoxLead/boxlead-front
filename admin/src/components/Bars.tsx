import "./Bars.css";

export type Bar = { key: string; label: string; value: number };

type BarsProps = {
  items: readonly Bar[];
  caption: string;
  unit: string;
};

const BAR = 8;
const GAP = 3;
const HEIGHT = 56;

export function Bars({ items, caption, unit }: BarsProps) {
  const max = Math.max(1, ...items.map((item) => item.value));
  const width = Math.max(BAR, items.length * (BAR + GAP) - GAP);
  const first = items[0];
  const last = items[items.length - 1];
  return (
    <figure className="bars">
      <svg className="bars-chart" viewBox={`0 0 ${width} ${HEIGHT}`} preserveAspectRatio="none" aria-hidden="true">
        {items.map((item, index) => {
          const height = Math.max(2, Math.round((item.value / max) * HEIGHT));
          return <rect key={item.key} className="bars-bar" x={index * (BAR + GAP)} y={HEIGHT - height} width={BAR} height={height} />;
        })}
      </svg>
      {first && last ? (
        <figcaption className="bars-axis">
          <span>{first.label}</span>
          <span>{last.label}</span>
        </figcaption>
      ) : null}
      <ul className="visually-hidden" aria-label={caption}>
        {items.map((item) => (
          <li key={item.key}>
            {item.label}, {item.value} {unit}
          </li>
        ))}
      </ul>
    </figure>
  );
}
