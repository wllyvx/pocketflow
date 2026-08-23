import { describe, expect, it } from "vitest";
import type { InsightsCategoryTotal, InsightsTrendBucket } from "@pocketflow/shared";
import {
  buildCategoryChart,
  buildSpendingRhythmChart,
  buildTrendChart,
  formatRupiah,
  resolvePresetRange,
  type RangePreset,
} from "./insights-chart";

const category = (name: string, total: number): InsightsCategoryTotal => ({
  id: name.toLowerCase(),
  name,
  total,
  percentage: 0,
});

const bucket = (
  label: string,
  incomeTotal: number,
  expenseTotal: number
): InsightsTrendBucket => ({
  start: "2026-03-01",
  end: "2026-03-07",
  label,
  incomeTotal,
  expenseTotal,
});

describe("buildCategoryChart", () => {
  it("produces one bar per category, sorted descending regardless of input order", () => {
    const result = buildCategoryChart([category("Groceries", 100), category("Dining", 250)]);

    expect(result.isEmpty).toBe(false);
    expect(result.bars.map((b) => b.name)).toEqual(["Dining", "Groceries"]);
    expect(result.bars).toHaveLength(2);
  });

  it("gives zero-total categories a zero-width bar", () => {
    const result = buildCategoryChart([category("Dining", 300), category("Fuel", 0)], { maxBarWidth: 200 });

    expect(result.bars[0].width).toBe(200);
    expect(result.bars[1].width).toBe(0);
  });

  it("gives the largest category the full bar width and scales the rest proportionally", () => {
    const maxBarWidth = 200;
    const result = buildCategoryChart(
      [category("Dining", 300), category("Groceries", 150), category("Fuel", 75)],
      { maxBarWidth }
    );

    expect(result.bars[0].width).toBe(200);
    expect(result.bars[1].width).toBe(100);
    expect(result.bars[2].width).toBe(50);
  });

  it("lays out bars vertically without overlap and in order", () => {
    const result = buildCategoryChart([category("A", 30), category("B", 20), category("C", 10)]);

    const ys = result.bars.map((b) => b.y);
    expect([...ys].sort((a, b) => a - b)).toEqual(ys);
    for (let i = 1; i < result.bars.length; i += 1) {
      expect(ys[i]).toBeGreaterThanOrEqual(ys[i - 1] + result.bars[i - 1].height);
    }
  });

  it("carries the amount label and percentage through for rendering", () => {
    const result = buildCategoryChart([category("Dining", 250)]);

    expect(result.bars[0].amountLabel).toBe("Rp 250");
    expect(result.bars[0].percentage).toBe(0);
  });

  it("signals empty data when there are no categories", () => {
    const result = buildCategoryChart([]);

    expect(result.isEmpty).toBe(true);
    expect(result.bars).toHaveLength(0);
  });
});

describe("buildSpendingRhythmChart", () => {
  const RHYTHM_WIDTH = 390;
  const RHYTHM_HEIGHT = 150;

  it("signals empty when there are no buckets or no expenses at all", () => {
    expect(buildSpendingRhythmChart([], { width: RHYTHM_WIDTH, height: RHYTHM_HEIGHT }).isEmpty).toBe(true);
    expect(
      buildSpendingRhythmChart([0, 0, 0], { width: RHYTHM_WIDTH, height: RHYTHM_HEIGHT }).isEmpty
    ).toBe(true);
  });

  it("returns no geometry when empty", () => {
    const result = buildSpendingRhythmChart([0, 0], { width: RHYTHM_WIDTH, height: RHYTHM_HEIGHT });

    expect(result.points).toHaveLength(0);
    expect(result.linePath).toBe("");
    expect(result.areaPath).toBe("");
  });

  it("produces one point per bucket spanning the full width", () => {
    const result = buildSpendingRhythmChart([10, 20, 30], { width: RHYTHM_WIDTH, height: RHYTHM_HEIGHT });

    expect(result.isEmpty).toBe(false);
    expect(result.points).toHaveLength(3);
    expect(result.points[0].x).toBeGreaterThanOrEqual(0);
    expect(result.points[result.points.length - 1].x).toBe(RHYTHM_WIDTH);
  });

  it("scales y so the largest expense sits at the top and zero at the bottom", () => {
    const result = buildSpendingRhythmChart([100, 50, 0], { width: RHYTHM_WIDTH, height: RHYTHM_HEIGHT });

    const ys = result.points.map((p) => p.y);
    expect(Math.min(...ys)).toBeCloseTo(0, 5);
    expect(ys[2]).toBeCloseTo(RHYTHM_HEIGHT, 5);
    expect(ys[1]).toBeCloseTo(RHYTHM_HEIGHT / 2, 5);
  });

  it("builds a polyline path and a closed area path ending at the baseline", () => {
    const result = buildSpendingRhythmChart([10, 20], { width: RHYTHM_WIDTH, height: RHYTHM_HEIGHT });

    expect(result.linePath).toMatch(/^M[\d.]+ [\d.]+ L[\d.]+ [\d.]+$/);
    expect(result.areaPath).toContain(result.linePath);
    expect(result.areaPath).toMatch(/V\d+(\.\d+)? H0 Z$/);
  });

  it("marks the last point for the end-of-line dot", () => {
    const result = buildSpendingRhythmChart([10, 20, 30], { width: RHYTHM_WIDTH, height: RHYTHM_HEIGHT });

    expect(result.last).toEqual(result.points[result.points.length - 1]);
  });
});

describe("buildTrendChart", () => {
  const WIDTH = 640;
  const HEIGHT = 200;

  it("signals empty when there are no buckets or both series are all zero", () => {
    expect(buildTrendChart([], { width: WIDTH, height: HEIGHT }).isEmpty).toBe(true);
    expect(
      buildTrendChart([bucket("w1", 0, 0), bucket("w2", 0, 0)], { width: WIDTH, height: HEIGHT }).isEmpty
    ).toBe(true);
  });

  it("produces one point per bucket per series spanning the full width", () => {
    const result = buildTrendChart(
      [bucket("w1", 10, 40), bucket("w2", 20, 30), bucket("w3", 30, 20)],
      { width: WIDTH, height: HEIGHT }
    );

    expect(result.isEmpty).toBe(false);
    expect(result.incomePoints).toHaveLength(3);
    expect(result.expensePoints).toHaveLength(3);
    expect(result.incomePoints[0].x).toBeGreaterThanOrEqual(0);
    expect(result.incomePoints[2].x).toBe(WIDTH);
    expect(result.expensePoints[2].x).toBe(WIDTH);
  });

  it("scales both series against the same combined max so heights are comparable", () => {
    const result = buildTrendChart(
      [bucket("w1", 100, 50), bucket("w2", 50, 25)],
      { width: WIDTH, height: HEIGHT }
    );

    expect(Math.min(...result.incomePoints.map((p) => p.y))).toBeCloseTo(0, 5);
    expect(result.incomePoints[1].y).toBeCloseTo(HEIGHT / 2, 5);
    expect(result.expensePoints[0].y).toBeCloseTo(HEIGHT / 2, 5);
    expect(result.expensePoints[1].y).toBeCloseTo((HEIGHT * 3) / 4, 5);
  });

  it("builds polyline and closed area paths for both series", () => {
    const result = buildTrendChart([bucket("w1", 10, 5), bucket("w2", 20, 10)], { width: WIDTH, height: HEIGHT });

    for (const path of [result.incomePath, result.expensePath]) {
      expect(path).toMatch(/^M[\d.]+ [\d.]+ L[\d.]+ [\d.]+$/);
    }
    for (const path of [result.incomeAreaPath, result.expenseAreaPath]) {
      expect(path).toMatch(/V\d+(\.\d+)? H0 Z$/);
    }
  });

  it("exposes the last point of each series for end-of-line dots", () => {
    const result = buildTrendChart([bucket("w1", 10, 5), bucket("w2", 20, 15)], { width: WIDTH, height: HEIGHT });

    expect(result.lastIncome).toEqual(result.incomePoints[result.incomePoints.length - 1]);
    expect(result.lastExpense).toEqual(result.expensePoints[result.expensePoints.length - 1]);
  });

  it("carries bucket labels through as axis labels positioned at each point", () => {
    const result = buildTrendChart(
      [bucket("Mar 1", 10, 5), bucket("Mar 8", 20, 15), bucket("Mar 15", 30, 25)],
      { width: WIDTH, height: HEIGHT }
    );

    expect(result.axisLabels.map((l) => l.text)).toEqual(["Mar 1", "Mar 8", "Mar 15"]);
    expect(result.axisLabels[2].x).toBe(WIDTH);
  });

  it("thins axis labels when there are more buckets than fit legibly", () => {
    const manyBuckets = Array.from({ length: 31 }, (_, i) =>
      bucket(`Day ${i + 1}`, i + 1, 31 - i)
    );
    const result = buildTrendChart(manyBuckets, { width: WIDTH, height: HEIGHT });

    expect(result.axisLabels.length).toBeLessThanOrEqual(8);
    expect(result.axisLabels[0].text).toBe("Day 1");
    expect(result.axisLabels.at(-1)?.text).toBe("Day 31");
  });
});

describe("formatRupiah", () => {
  it("formats whole amounts with Rp prefix and id-ID grouping", () => {
    expect(formatRupiah(1250000)).toBe("Rp 1.250.000");
    expect(formatRupiah(0)).toBe("Rp 0");
  });
});

describe("resolvePresetRange", () => {
  it.each<[RangePreset, string, string, string]>([
    ["7d", "2026-03-15T12:00:00", "2026-03-09", "2026-03-15"],
    ["month", "2026-03-15T12:00:00", "2026-03-01", "2026-03-31"],
    ["3m", "2026-03-15T12:00:00", "2026-01-01", "2026-03-31"],
  ])("resolves %s to %s..%s for %s", (preset, now, expectedFrom, expectedTo) => {
    expect(resolvePresetRange(preset, new Date(now))).toEqual({
      from: expectedFrom,
      to: expectedTo,
    });
  });

  it("handles month boundaries for the 7-day preset", () => {
    expect(resolvePresetRange("7d", new Date("2026-03-03T12:00:00"))).toEqual({
      from: "2026-02-25",
      to: "2026-03-03",
    });
  });
});
