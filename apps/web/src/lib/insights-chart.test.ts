import { describe, expect, it } from "vitest";
import type { InsightsCategoryTotal } from "@pocketflow/shared";
import {
  buildCategoryChart,
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
