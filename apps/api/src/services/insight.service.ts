import { and, eq, gte, lte } from "drizzle-orm";
import type {
  InsightsGranularity,
  InsightsQuery,
  InsightsSummary,
  InsightsTrendBucket,
} from "@pocketflow/shared";
import type { createDb } from "../db/client";
import { categories, transactions } from "../db/schema";
import { ServiceError } from "./transaction.service";

type Database = ReturnType<typeof createDb>;

const DAY_MS = 24 * 60 * 60 * 1000;
const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface InsightRow {
  type: string;
  amount: number;
  date: Date;
  categoryId: string | null;
  categoryName: string | null;
}

function resolveRange(query: InsightsQuery): { from: Date; to: Date } {
  const now = new Date();

  const from = query.from
    ? new Date(`${query.from}T00:00:00`)
    : new Date(now.getFullYear(), now.getMonth(), 1);

  const to = query.to
    ? new Date(`${query.to}T23:59:59.999`)
    : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  if (from > to) {
    throw new ServiceError("INVALID_DATE_RANGE", "from must be on or before to.", 400);
  }

  const maxTo = new Date(from.getFullYear(), from.getMonth() + 12, from.getDate());
  if (new Date(to.getFullYear(), to.getMonth(), to.getDate()) > maxTo) {
    throw new ServiceError("DATE_RANGE_TOO_LONG", "Date range cannot span more than 12 months.", 400);
  }

  return { from, to };
}

function pickGranularity(from: Date, to: Date): InsightsGranularity {
  const days = (to.getTime() - from.getTime()) / DAY_MS;
  if (days <= 31) return "daily";
  if (days <= 120) return "weekly";
  return "monthly";
}

function dayLabel(date: Date): string {
  return `${MONTH_NAMES[date.getMonth()]} ${String(date.getDate()).padStart(2, "0")}`;
}

function isoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildBuckets(from: Date, to: Date, granularity: InsightsGranularity): InsightsTrendBucket[] {
  const buckets: InsightsTrendBucket[] = [];
  let cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());

  while (cursor <= to) {
    const start = new Date(cursor);
    let end: Date;
    let label: string;

    if (granularity === "daily") {
      end = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate(), 23, 59, 59, 999);
      label = dayLabel(start);
      cursor = new Date(end.getTime() + 1);
    } else if (granularity === "weekly") {
      const endDate = new Date(cursor.getTime() + 6 * DAY_MS);
      end = endDate > to
        ? new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59, 999)
        : new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999);
      label = `${dayLabel(start)} - ${dayLabel(end)}`;
      cursor = new Date(end.getTime() + 1);
    } else {
      end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0, 23, 59, 59, 999);
      label = `${MONTH_NAMES[start.getMonth()]} ${start.getFullYear()}`;
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }

    buckets.push({
      start: isoDate(start),
      end: isoDate(end),
      label,
      incomeTotal: 0,
      expenseTotal: 0,
    });
  }

  return buckets;
}

export async function getInsightsSummary(
  db: Database,
  userId: string,
  query: InsightsQuery
): Promise<InsightsSummary> {
  const { from, to } = resolveRange(query);
  const granularity = pickGranularity(from, to);

  const rows: InsightRow[] = await db
    .select({
      type: transactions.type,
      amount: transactions.amount,
      date: transactions.date,
      categoryId: transactions.categoryId,
      categoryName: categories.name,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.date, from),
        lte(transactions.date, to)
      )
    );

  const buckets = buildBuckets(from, to, granularity);
  const totalsByCategory = new Map<string, { id: string | null; name: string; total: number }>();

  for (const row of rows) {
    if (row.type === "transfer") continue;

    const bucket = buckets.find(
      (b) => row.date >= new Date(`${b.start}T00:00:00`) && row.date <= new Date(`${b.end}T23:59:59.999`)
    );
    if (!bucket) continue;

    if (row.type === "income") {
      bucket.incomeTotal += row.amount;
    } else if (row.type === "expense") {
      bucket.expenseTotal += row.amount;

      const key = row.categoryId ?? "uncategorized";
      const entry = totalsByCategory.get(key) ?? {
        id: row.categoryId,
        name: row.categoryName ?? "Uncategorized",
        total: 0,
      };
      entry.total += row.amount;
      totalsByCategory.set(key, entry);
    }
  }

  const expenseGrandTotal = [...totalsByCategory.values()].reduce((sum, c) => sum + c.total, 0);
  const categoryTotals = [...totalsByCategory.values()]
    .filter((c) => c.total !== 0)
    .sort((a, b) => b.total - a.total)
    .map((c) => ({
      id: c.id,
      name: c.name,
      total: c.total,
      percentage:
        expenseGrandTotal === 0 ? 0 : Math.round((c.total / expenseGrandTotal) * 10000) / 100,
    }));

  return {
    categories: categoryTotals,
    trend: buckets,
    meta: {
      from: isoDate(from),
      to: isoDate(to),
      granularity,
      currency: "IDR",
    },
  };
}
