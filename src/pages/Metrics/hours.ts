export type PeakWindow = {
  weekday: number;
  from: number;
  to: number;
  share: number;
};

export function peakWindow(hourly: number[], width = 3): PeakWindow | null {
  const total = hourly.reduce((sum, value) => sum + value, 0);
  if (total === 0) return null;
  let best: PeakWindow | null = null;
  let bestValue = -1;
  for (let weekday = 0; weekday < 7; weekday++) {
    for (let hour = 0; hour <= 24 - width; hour++) {
      const start = weekday * 24 + hour;
      const value = hourly.slice(start, start + width).reduce((sum, count) => sum + count, 0);
      if (value > bestValue) {
        bestValue = value;
        best = { weekday, from: hour, to: hour + width, share: value / total };
      }
    }
  }
  return best;
}

export function heatLevels(hourly: number[], levels: number): number[] {
  const max = Math.max(0, ...hourly);
  if (max === 0) return hourly.map(() => 0);
  return hourly.map((value) => (value === 0 ? 0 : Math.max(1, Math.ceil((value / max) * levels))));
}
