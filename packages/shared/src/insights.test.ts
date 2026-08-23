/// <reference types="vitest" />
import { describe, expect, it } from "vitest";
import {
  insightsQuerySchema,
  insightsGranularitySchema,
} from "./insights";

describe("insightsQuerySchema", () => {
  it("accepts an empty query (defaults applied downstream)", () => {
    const parsed = insightsQuerySchema.parse({});
    expect(parsed.from).toBeUndefined();
    expect(parsed.to).toBeUndefined();
  });

  it("accepts a valid from/to pair", () => {
    const parsed = insightsQuerySchema.parse({ from: "2026-01-01", to: "2026-03-31" });
    expect(parsed.from).toBe("2026-01-01");
    expect(parsed.to).toBe("2026-03-31");
  });

  it("rejects when only one of from/to is provided", () => {
    const result = insightsQuerySchema.safeParse({ from: "2026-01-01" });
    expect(result.success).toBe(false);
  });

  it("rejects invalid date strings", () => {
    const result = insightsQuerySchema.safeParse({ from: "not-a-date", to: "2026-03-31" });
    expect(result.success).toBe(false);
  });

  it("accepts out-of-order or over-long ranges (range rules enforced by the API service)", () => {
    expect(insightsQuerySchema.safeParse({ from: "2026-04-01", to: "2026-03-31" }).success).toBe(true);
    expect(insightsQuerySchema.safeParse({ from: "2025-01-01", to: "2026-02-01" }).success).toBe(true);
  });
});

describe("insightsGranularitySchema", () => {
  it("only allows daily, weekly and monthly", () => {
    expect(insightsGranularitySchema.safeParse("daily").success).toBe(true);
    expect(insightsGranularitySchema.safeParse("weekly").success).toBe(true);
    expect(insightsGranularitySchema.safeParse("monthly").success).toBe(true);
    expect(insightsGranularitySchema.safeParse("yearly").success).toBe(false);
  });
});
