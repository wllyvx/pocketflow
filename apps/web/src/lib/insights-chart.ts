import type { InsightsCategoryTotal, InsightsTrendBucket } from "@pocketflow/shared";

export type RangePreset = "7d" | "month" | "3m";

export interface PresetRange {
  from: string;
  to: string;
}

export interface CategoryBar {
  id: string | null;
  name: string;
  amountLabel: string;
  percentage: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CategoryChart {
  bars: CategoryBar[];
  isEmpty: boolean;
}

export const BAR_HEIGHT = 28;
export const BAR_GAP = 14;
export const MAX_BAR_WIDTH = 240;

const isoDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export function formatRupiah(amount: number): string {
  return `Rp ${new Intl.NumberFormat("id-ID").format(amount)}`;
}

export function resolvePresetRange(preset: RangePreset, now: Date): PresetRange {
  if (preset === "7d") {
    const from = new Date(now);
    from.setDate(from.getDate() - 6);
    return { from: isoDate(from), to: isoDate(now) };
  }

  const year = now.getFullYear();
  const month = now.getMonth();

  if (preset === "month") {
    return {
      from: isoDate(new Date(year, month, 1)),
      to: isoDate(new Date(year, month + 1, 0)),
    };
  }

  return {
    from: isoDate(new Date(year, month - 2, 1)),
    to: isoDate(new Date(year, month + 1, 0)),
  };
}

export function buildCategoryChart(
  categories: InsightsCategoryTotal[],
  options?: { maxBarWidth?: number }
): CategoryChart {
  if (categories.length === 0) {
    return { bars: [], isEmpty: true };
  }

  const maxBarWidth = options?.maxBarWidth ?? MAX_BAR_WIDTH;
  const sorted = [...categories].sort((a, b) => b.total - a.total);
  const maxTotal = sorted[0].total;

  const bars = sorted.map((category, index) => ({
    id: category.id,
    name: category.name,
    amountLabel: formatRupiah(category.total),
    percentage: category.percentage,
    x: 0,
    y: index * (BAR_HEIGHT + BAR_GAP),
    width:
      maxTotal === 0 || category.total <= 0
        ? 0
        : Math.max(2, Math.round((category.total / maxTotal) * maxBarWidth)),
    height: BAR_HEIGHT,
  }));

  return { bars, isEmpty: false };
}

export interface RhythmPoint {
  x: number;
  y: number;
}

export interface SpendingRhythmChart {
  points: RhythmPoint[];
  last: RhythmPoint;
  linePath: string;
  areaPath: string;
  isEmpty: boolean;
}

const formatCoord = (value: number): string =>
  Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0$/, "");

export function buildSpendingRhythmChart(
  expenseTotals: number[],
  options?: { width?: number; height?: number }
): SpendingRhythmChart {
  const width = options?.width ?? 390;
  const height = options?.height ?? 150;

  if (expenseTotals.length === 0 || !expenseTotals.some((total) => total > 0)) {
    return { points: [], last: { x: 0, y: height }, linePath: "", areaPath: "", isEmpty: true };
  }

  const maxTotal = Math.max(...expenseTotals);
  const step = expenseTotals.length > 1 ? width / (expenseTotals.length - 1) : width;

  const points = expenseTotals.map((total, index) => ({
    x: index * step,
    y: maxTotal === 0 ? height : height - (total / maxTotal) * height,
  }));

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"}${formatCoord(point.x)} ${formatCoord(point.y)}`)
    .join(" ");
  const areaPath = `${linePath} V${height} H0 Z`;

  return { points, last: points[points.length - 1], linePath, areaPath, isEmpty: false };
}

export interface TrendAxisLabel {
  x: number;
  text: string;
}

export interface TrendChart {
  incomePoints: RhythmPoint[];
  expensePoints: RhythmPoint[];
  lastIncome: RhythmPoint;
  lastExpense: RhythmPoint;
  incomePath: string;
  expensePath: string;
  incomeAreaPath: string;
  expenseAreaPath: string;
  axisLabels: TrendAxisLabel[];
  isEmpty: boolean;
}

const MAX_AXIS_LABELS = 8;

const toLine = (points: RhythmPoint[]): string =>
  points
    .map((point, index) => `${index === 0 ? "M" : "L"}${formatCoord(point.x)} ${formatCoord(point.y)}`)
    .join(" ");

const toArea = (points: RhythmPoint[], height: number): string =>
  `${toLine(points)} V${height} H0 Z`;

export function buildTrendChart(
  buckets: InsightsTrendBucket[],
  options?: { width?: number; height?: number }
): TrendChart {
  const width = options?.width ?? 640;
  const height = options?.height ?? 200;

  if (
    buckets.length === 0 ||
    !buckets.some((b) => b.incomeTotal > 0 || b.expenseTotal > 0)
  ) {
    return {
      incomePoints: [],
      expensePoints: [],
      lastIncome: { x: 0, y: height },
      lastExpense: { x: 0, y: height },
      incomePath: "",
      expensePath: "",
      incomeAreaPath: "",
      expenseAreaPath: "",
      axisLabels: [],
      isEmpty: true,
    };
  }

  const step = buckets.length > 1 ? width / (buckets.length - 1) : width;
  const maxTotal = Math.max(
    ...buckets.flatMap((b) => [b.incomeTotal, b.expenseTotal])
  );

  const scalePoints = (pick: (b: InsightsTrendBucket) => number): RhythmPoint[] =>
    buckets.map((b, index) => ({
      x: index * step,
      y: maxTotal === 0 ? height : height - (pick(b) / maxTotal) * height,
    }));

  const incomePoints = scalePoints((b) => b.incomeTotal);
  const expensePoints = scalePoints((b) => b.expenseTotal);

  let labelIndexes = buckets.map((_, index) => index);
  if (labelIndexes.length > MAX_AXIS_LABELS) {
    labelIndexes = Array.from(
      { length: MAX_AXIS_LABELS },
      (_, i) => Math.round((i * (buckets.length - 1)) / (MAX_AXIS_LABELS - 1))
    );
  }
  const axisLabels = labelIndexes.map((index) => ({
    x: index * step,
    text: buckets[index].label,
  }));

  return {
    incomePoints,
    expensePoints,
    lastIncome: incomePoints[incomePoints.length - 1],
    lastExpense: expensePoints[expensePoints.length - 1],
    incomePath: toLine(incomePoints),
    expensePath: toLine(expensePoints),
    incomeAreaPath: toArea(incomePoints, height),
    expenseAreaPath: toArea(expensePoints, height),
    axisLabels,
    isEmpty: false,
  };
}
