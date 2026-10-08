export function niceMax(value: number): number {
  if (value <= 0) return 4;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  for (const step of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10]) {
    const candidate = step * magnitude;
    if (candidate >= value) return candidate;
  }
  return 10 * magnitude;
}

export function ticks(max: number, count = 4): number[] {
  return Array.from({ length: count + 1 }, (_, index) => (max / count) * index);
}

export function labelIndexes(length: number, maxLabels: number): number[] {
  if (length <= maxLabels) return Array.from({ length }, (_, index) => index);
  const step = Math.ceil(length / maxLabels);
  const indexes: number[] = [];
  for (let index = length - 1; index >= 0; index -= step) indexes.unshift(index);
  return indexes;
}
