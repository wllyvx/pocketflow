import { z } from "zod";

const insightsDateStringSchema = z
  .string()
  .trim()
  .min(1)
  .refine((val) => !isNaN(new Date(val).getTime()), {
    message: "Date must be a valid date.",
  });

export const insightsGranularitySchema = z.enum(["daily", "weekly", "monthly"]);
export type InsightsGranularity = z.infer<typeof insightsGranularitySchema>;

export const insightsQuerySchema = z
  .object({
    from: insightsDateStringSchema.optional(),
    to: insightsDateStringSchema.optional(),
  })
  .superRefine((input, ctx) => {
    if ((input.from === undefined) !== (input.to === undefined)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: input.from === undefined ? ["from"] : ["to"],
        message: "Both from and to are required when filtering by date range.",
      });
    }
  });

export type InsightsQuery = z.infer<typeof insightsQuerySchema>;

export interface InsightsCategoryTotal {
  id: string | null;
  name: string;
  total: number;
  percentage: number;
}

export interface InsightsTrendBucket {
  start: string;
  end: string;
  label: string;
  incomeTotal: number;
  expenseTotal: number;
}

export interface InsightsSummaryMeta {
  from: string;
  to: string;
  granularity: InsightsGranularity;
  currency: string;
}

export interface InsightsSummary {
  categories: InsightsCategoryTotal[];
  trend: InsightsTrendBucket[];
  meta: InsightsSummaryMeta;
}
