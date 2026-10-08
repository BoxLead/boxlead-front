export function labelIndexes(length: number, maxLabels: number): number[] {
  if (length <= maxLabels) return Array.from({ length }, (_, index) => index);
  const step = Math.ceil(length / maxLabels);
  const indexes: number[] = [];
  for (let index = length - 1; index >= 0; index -= step) indexes.unshift(index);
  return indexes;
}

export function niceScale(value: number, count = 4): { max: number; ticks: number[] } {
  const raw = Math.max(value, 1e-9) / count;
  const magnitude = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 1.5, 2, 2.5, 5, 10].map((factor) => factor * magnitude).find((candidate) => candidate >= raw) ?? 10 * magnitude;
  const round = (value: number) => Number(value.toPrecision(12));
  return { max: round(step * count), ticks: Array.from({ length: count + 1 }, (_, index) => round(step * index)) };
}
