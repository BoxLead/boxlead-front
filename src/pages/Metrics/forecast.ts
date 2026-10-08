import { addDays, weekdayIndex } from "../../util/dates";

export type ForecastPoint = {
  date: string;
  value: number;
  low: number;
  high: number;
};

export type Forecast = {
  points: ForecastPoint[];
  total: number;
  low: number;
  high: number;
};

const Z_80 = 1.2816;
const MIN_HISTORY_DAYS = 28;
const MAX_HISTORY_DAYS = 84;

export function forecastDaily(
  history: { date: string; value: number }[],
  horizon: number,
  skip = 0,
): Forecast | null {
  const firstActive = history.findIndex((point) => point.value > 0);
  if (firstActive === -1 || horizon <= 0) return null;
  const series = history.slice(Math.max(firstActive, history.length - MAX_HISTORY_DAYS));
  if (series.length < MIN_HISTORY_DAYS) return null;
  const mean = series.reduce((sum, point) => sum + point.value, 0) / series.length;
  if (mean === 0) return null;

  const weekdaySums = Array.from({ length: 7 }, () => ({ total: 0, count: 0 }));
  for (const point of series) {
    const entry = weekdaySums[weekdayIndex(point.date)];
    entry.total += point.value;
    entry.count += 1;
  }
  const seasonal = weekdaySums.map((entry) => (entry.count > 0 && entry.total > 0 ? entry.total / entry.count / mean : 1));

  const adjusted = series.map((point, index) => ({ x: index, y: point.value / seasonal[weekdayIndex(point.date)] }));
  const n = adjusted.length;
  const meanX = (n - 1) / 2;
  const meanY = adjusted.reduce((sum, point) => sum + point.y, 0) / n;
  let numerator = 0;
  let denominator = 0;
  for (const point of adjusted) {
    numerator += (point.x - meanX) * (point.y - meanY);
    denominator += (point.x - meanX) ** 2;
  }
  const slope = denominator === 0 ? 0 : numerator / denominator;
  const intercept = meanY - slope * meanX;

  let squared = 0;
  series.forEach((point, index) => {
    const fitted = (intercept + slope * index) * seasonal[weekdayIndex(point.date)];
    squared += (point.value - fitted) ** 2;
  });
  const sigma = Math.sqrt(squared / Math.max(1, n - 2));

  const last = series[series.length - 1].date;
  const points: ForecastPoint[] = [];
  for (let step = 1 + skip; step <= horizon + skip; step++) {
    const date = addDays(last, step);
    const value = Math.max(0, (intercept + slope * (n - 1 + step)) * seasonal[weekdayIndex(date)]);
    const spread = Z_80 * sigma * Math.sqrt(1 + 1 / n);
    points.push({ date, value, low: Math.max(0, value - spread), high: value + spread });
  }
  const total = points.reduce((sum, point) => sum + point.value, 0);
  const totalSpread = Z_80 * sigma * Math.sqrt(horizon);
  return { points, total, low: Math.max(0, total - totalSpread), high: total + totalSpread };
}
