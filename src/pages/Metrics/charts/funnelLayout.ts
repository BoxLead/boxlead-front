export type FunnelBar = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type FunnelLayout = {
  bars: FunnelBar[];
  ghosts: FunnelBar[];
  bands: string[];
  columnWidth: number;
  center: number;
};

const PADDING = 10;
const MIN_HEIGHT = 3;

function bar(value: number, max: number, column: number, columnWidth: number, width: number, height: number): FunnelBar {
  const inner = height - PADDING * 2;
  const size = max > 0 ? Math.max(MIN_HEIGHT, (value / max) * inner) : MIN_HEIGHT;
  return { x: columnWidth * column + (columnWidth - width) / 2, y: PADDING + (inner - size) / 2, width, height: size };
}

function band(from: FunnelBar, to: FunnelBar): string {
  const x1 = from.x + from.width;
  const x2 = to.x;
  const mid = (x1 + x2) / 2;
  const top1 = from.y;
  const top2 = to.y;
  const bottom1 = from.y + from.height;
  const bottom2 = to.y + to.height;
  return [
    `M${x1},${top1}`,
    `C${mid},${top1} ${mid},${top2} ${x2},${top2}`,
    `L${x2},${bottom2}`,
    `C${mid},${bottom2} ${mid},${bottom1} ${x1},${bottom1}`,
    "Z",
  ].join(" ");
}

export function layoutFunnel(values: number[], previous: number[], width: number, height: number): FunnelLayout {
  const columnWidth = width / Math.max(1, values.length);
  const barWidth = Math.min(40, Math.max(16, columnWidth * 0.2));
  const max = Math.max(0, ...values, ...previous);
  const bars = values.map((value, index) => bar(value, max, index, columnWidth, barWidth, height));
  return {
    bars,
    ghosts: previous.map((value, index) => bar(value, max, index, columnWidth, barWidth, height)),
    bands: bars.slice(1).map((next, index) => band(bars[index], next)),
    columnWidth,
    center: height / 2,
  };
}
