/// <reference types="vitest" />
import { describe, expect, it } from "vitest";
import type { InsightsQuery } from "@pocketflow/shared";
import { getInsightsSummary } from "./insight.service";

interface StubRow {
  type: string;
  amount: number;
  date: Date;
  categoryId: string | null;
  categoryName: string | null;
}

function createInsightsDatabase(rows: StubRow[]) {
  const query = {
    from: () => query,
    leftJoin: () => query,
    where: () => query,
    then: (resolve: (value: StubRow[]) => void, reject: (error: unknown) => void) =>
      Promise.resolve(rows).then(resolve, reject),
  };
  return { select: () => query } as any;
}

const expense = (amount: number, categoryId: string | null, categoryName: string | null, day: string): StubRow => ({
  type: "expense",
  amount,
  date: new Date(`${day}T12:00:00`),
  categoryId,
  categoryName,
});

describe("getInsightsSummary", () => {
  it("aggregates expenses per category, sorted descending, omitting zero totals", async () => {
    const db = createInsightsDatabase([
      expense(250, "cat-b", "Dining", "2026-03-02"),
      expense(100, "cat-a", "Groceries", "2026-03-05"),
      expense(0, "cat-c", "Fuel", "2026-03-07"),
    ]);

    const result = await getInsightsSummary(db, "user-1", {
      from: "2026-03-01",
      to: "2026-03-31",
    });

    expect(result.categories).toEqual([
      { id: "cat-b", name: "Dining", total: 250, percentage: 71.43 },
      { id: "cat-a", name: "Groceries", total: 100, percentage: 28.57 },
    ]);
  });

  it("labels uncategorized expenses under Uncategorized", async () => {
    const db = createInsightsDatabase([expense(40, null, null, "2026-03-02")]);

    const result = await getInsightsSummary(db, "user-1", { from: "2026-03-01", to: "2026-03-31" });

    expect(result.categories).toEqual([
      { id: null, name: "Uncategorized", total: 40, percentage: 100 },
    ]);
  });

  it("uses daily buckets for ranges up to 31 days", async () => {
    const db = createInsightsDatabase([]);

    const result = await getInsightsSummary(db, "user-1", { from: "2026-03-01", to: "2026-03-31" });

    expect(result.meta.granularity).toBe("daily");
    expect(result.trend).toHaveLength(31);
    expect(result.trend[0]).toMatchObject({ label: "Mar 01", incomeTotal: 0, expenseTotal: 0 });
  });

  it("uses weekly buckets for ranges up to ~120 days", async () => {
    const db = createInsightsDatabase([]);

    const result = await getInsightsSummary(db, "user-1", { from: "2026-01-01", to: "2026-04-30" });

    expect(result.meta.granularity).toBe("weekly");
    expect(result.trend).toHaveLength(18);
    expect(result.trend[0]).toMatchObject({
      start: "2026-01-01",
      end: "2026-01-07",
      label: "Jan 01 - Jan 07",
    });
    expect(result.trend[17].end).toBe("2026-04-30");
  });

  it("uses monthly buckets beyond ~120 days", async () => {
    const db = createInsightsDatabase([]);

    const result = await getInsightsSummary(db, "user-1", { from: "2026-01-01", to: "2026-12-31" });

    expect(result.meta.granularity).toBe("monthly");
    expect(result.trend).toHaveLength(12);
    expect(result.trend[11]).toMatchObject({ label: "Dec 2026", end: "2026-12-31" });
  });

  it("sums income and expense into their containing buckets only", async () => {
    const db = createInsightsDatabase([
      { type: "income", amount: 1000, date: new Date("2026-03-03T09:00:00"), categoryId: null, categoryName: null },
      expense(200, "cat-a", "Groceries", "2026-03-10"),
      expense(300, "cat-b", "Dining", "2026-03-20"),
      expense(999, "cat-b", "Dining", "2026-04-01"),
    ]);

    const result = await getInsightsSummary(db, "user-1", { from: "2026-03-01", to: "2026-03-31" });

    expect(result.trend.reduce((total, b) => total + b.incomeTotal, 0)).toBe(1000);
    expect(result.trend[2]).toMatchObject({ label: "Mar 03", incomeTotal: 1000, expenseTotal: 0 });
    expect(result.trend.reduce((total, b) => total + b.expenseTotal, 0)).toBe(500);
  });

  it("excludes transfers from category totals and trend buckets", async () => {
    const db = createInsightsDatabase([
      expense(120, "cat-a", "Groceries", "2026-03-04"),
      { type: "transfer", amount: 500, date: new Date("2026-03-06T10:00:00"), categoryId: "cat-a", categoryName: "Groceries" },
    ]);

    const result = await getInsightsSummary(db, "user-1", { from: "2026-03-01", to: "2026-03-31" });

    expect(result.categories).toHaveLength(1);
    expect(result.categories[0].total).toBe(120);
    expect(result.trend.every((b) => b.incomeTotal === 0 && b.expenseTotal === 0 || b.expenseTotal === 120)).toBe(true);
    expect(result.trend.reduce((total, b) => total + b.incomeTotal, 0)).toBe(0);
  });

  it("returns a well-formed empty shape when there is no data", async () => {
    const db = createInsightsDatabase([]);

    const result = await getInsightsSummary(db, "user-1", { from: "2026-03-01", to: "2026-03-31" });

    expect(result.categories).toEqual([]);
    expect(result.trend).toHaveLength(31);
    expect(result.trend.every((b) => b.incomeTotal === 0 && b.expenseTotal === 0)).toBe(true);
    expect(result.meta).toMatchObject({
      from: "2026-03-01",
      to: "2026-03-31",
      granularity: "daily",
      currency: "IDR",
    });
  });

  it("defaults to the current month when no range is provided", async () => {
    const db = createInsightsDatabase([]);
    const now = new Date();
    const expectedFrom = new Date(now.getFullYear(), now.getMonth(), 1);

    const result = await getInsightsSummary(db, "user-1", {} as InsightsQuery);

    expect(result.meta.granularity).toBe("daily");
    expect(new Date(result.meta.from).getFullYear()).toBe(expectedFrom.getFullYear());
    expect(new Date(result.meta.from).getMonth()).toBe(expectedFrom.getMonth());
  });

  it("rejects from after to with a distinct code", async () => {
    const db = createInsightsDatabase([]);

    await expect(
      getInsightsSummary(db, "user-1", { from: "2026-04-01", to: "2026-03-31" })
    ).rejects.toMatchObject({ code: "INVALID_DATE_RANGE", statusCode: 400 });
  });

  it("rejects spans longer than 12 months with a distinct code", async () => {
    const db = createInsightsDatabase([]);

    await expect(
      getInsightsSummary(db, "user-1", { from: "2025-01-01", to: "2026-02-01" })
    ).rejects.toMatchObject({ code: "DATE_RANGE_TOO_LONG", statusCode: 400 });
  });

  it("accepts a span of exactly 12 months", async () => {
    const db = createInsightsDatabase([]);

    const result = await getInsightsSummary(db, "user-1", { from: "2025-01-01", to: "2026-01-01" });

    expect(result.meta.granularity).toBe("monthly");
  });
});
