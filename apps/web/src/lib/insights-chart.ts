import type { InsightsCategoryTotal } from "@pocketflow/shared";

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
