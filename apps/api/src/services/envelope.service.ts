import { and, asc, count, eq, or, sql } from "drizzle-orm";
import type {
  CreateEnvelopeInput,
  DeleteEnvelopeInput,
  EnvelopeItem,
  FillEnvelopeInput,
  TransferEnvelopeInput,
  UpdateEnvelopeInput,
} from "@pocketflow/shared";
import type { createDb } from "../db/client";
import { categories, envelopes, transactions } from "../db/schema";
import { ServiceError } from "./transaction.service";

type Database = ReturnType<typeof createDb>;

function toIsoDate(value: Date | number): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function formatEnvelopeRow(
  row: typeof envelopes.$inferSelect,
  categoryName?: string | null,
  summary?: Pick<EnvelopeItem, "relatedTransactionCount" | "totalSpent" | "remainingAmount" | "isOverBudget">
): EnvelopeItem {
  return {
    id: row.id,
    userId: row.userId,
    categoryId: row.categoryId,
    categoryName: categoryName ?? null,
    name: row.name,
    budgetedAmount: row.budgetedAmount,
    currentAmount: row.currentAmount,
    resetFrequency: row.resetFrequency as EnvelopeItem["resetFrequency"],
    lastResetDate: toIsoDate(row.lastResetDate),
    createdAt: toIsoDate(row.createdAt),
    updatedAt: toIsoDate(row.updatedAt),
    ...summary,
  };
}

async function findEnvelope(db: Database, userId: string, id: string) {
  return db
    .select({ envelope: envelopes, categoryName: categories.name })
    .from(envelopes)
    .leftJoin(categories, eq(envelopes.categoryId, categories.id))
    .where(and(eq(envelopes.id, id), eq(envelopes.userId, userId)))
    .limit(1)
    .then((rows) => rows[0]);
}

export async function calculateAvailableToSpend(db: Database, userId: string): Promise<number> {
  const [incomeResult, envelopeResult] = await Promise.all([
    db
      .select({ total: sql<number>`coalesce(sum(${transactions.amount}), 0)` })
      .from(transactions)
      .where(and(eq(transactions.userId, userId), eq(transactions.type, "income"))),
    db
      .select({ total: sql<number>`coalesce(sum(${envelopes.currentAmount}), 0)` })
      .from(envelopes)
      .where(eq(envelopes.userId, userId)),
  ]);

  return Number(incomeResult[0]?.total ?? 0) - Number(envelopeResult[0]?.total ?? 0);
}

export async function listEnvelopes(db: Database, userId: string): Promise<EnvelopeItem[]> {
  const rows = await db
    .select({ envelope: envelopes, categoryName: categories.name })
    .from(envelopes)
    .leftJoin(categories, eq(envelopes.categoryId, categories.id))
    .where(eq(envelopes.userId, userId))
    .orderBy(asc(envelopes.createdAt), asc(envelopes.name));

  return rows.map((row) => formatEnvelopeRow(row.envelope, row.categoryName));
}

export async function getEnvelopeById(db: Database, userId: string, id: string): Promise<EnvelopeItem | null> {
  const row = await findEnvelope(db, userId, id);
  if (!row) return null;

  const [summary] = await db
    .select({
      relatedTransactionCount: count(),
      totalSpent: sql<number>`coalesce(sum(case when ${transactions.type} = 'expense' then ${transactions.amount} else 0 end), 0)`,
    })
    .from(transactions)
    .where(and(
      eq(transactions.userId, userId),
      or(eq(transactions.envelopeId, id), eq(transactions.destinationEnvelopeId, id)),
    ));

  return formatEnvelopeRow(row.envelope, row.categoryName, {
    relatedTransactionCount: Number(summary?.relatedTransactionCount ?? 0),
    totalSpent: Number(summary?.totalSpent ?? 0),
    remainingAmount: row.envelope.currentAmount,
    isOverBudget: Number(summary?.totalSpent ?? 0) > row.envelope.budgetedAmount,
  });
}

export async function getEnvelopeDeletePreview(db: Database, userId: string, id: string) {
  const existing = await findEnvelope(db, userId, id);
  if (!existing) return null;

  const [related] = await db
    .select({ relatedTransactionCount: count() })
    .from(transactions)
    .where(and(
      eq(transactions.userId, userId),
      or(eq(transactions.envelopeId, id), eq(transactions.destinationEnvelopeId, id)),
    ));

  return {
    envelopeId: id,
    currentAmount: existing.envelope.currentAmount,
    relatedTransactionCount: Number(related?.relatedTransactionCount ?? 0),
    requiresBalanceAction: existing.envelope.currentAmount !== 0,
  };
}

export async function createEnvelope(db: Database, userId: string, input: CreateEnvelopeInput): Promise<EnvelopeItem> {
  const category = await db
    .select()
    .from(categories)
    .where(and(eq(categories.id, input.categoryId), or(eq(categories.userId, userId), sql`${categories.userId} is null`)))
    .limit(1)
    .then((rows) => rows[0]);
  if (!category) {
    throw new ServiceError("CATEGORY_NOT_FOUND", "Category not found.", 404);
  }

  const duplicate = await db
    .select({ id: envelopes.id })
    .from(envelopes)
    .where(and(eq(envelopes.userId, userId), eq(envelopes.name, input.name)))
    .limit(1);
  if (duplicate.length > 0) {
    throw new ServiceError("DUPLICATE_NAME", "An envelope with this name already exists.", 409);
  }

  const now = new Date();
  const [created] = await db.insert(envelopes).values({
    id: crypto.randomUUID(),
    userId,
    categoryId: input.categoryId,
    name: input.name,
    budgetedAmount: input.budgetedAmount,
    currentAmount: 0,
    resetFrequency: input.resetFrequency,
    lastResetDate: now,
    createdAt: now,
    updatedAt: now,
  }).returning();

  return formatEnvelopeRow(created, category.name);
}

export async function updateEnvelope(db: Database, userId: string, id: string, input: UpdateEnvelopeInput): Promise<EnvelopeItem> {
  const existing = await findEnvelope(db, userId, id);
  if (!existing) {
    throw new ServiceError("NOT_FOUND", "Envelope not found.", 404);
  }

  if (input.name && input.name !== existing.envelope.name) {
    const duplicate = await db
      .select({ id: envelopes.id })
      .from(envelopes)
      .where(and(eq(envelopes.userId, userId), eq(envelopes.name, input.name)))
      .limit(1);
    if (duplicate.length > 0) {
      throw new ServiceError("DUPLICATE_NAME", "An envelope with this name already exists.", 409);
    }
  }

  let categoryName = existing.categoryName;
  if (input.categoryId && input.categoryId !== existing.envelope.categoryId) {
    const category = await db
      .select()
      .from(categories)
      .where(and(eq(categories.id, input.categoryId), or(eq(categories.userId, userId), sql`${categories.userId} is null`)))
      .limit(1)
      .then((rows) => rows[0]);
    if (!category) {
      throw new ServiceError("CATEGORY_NOT_FOUND", "Category not found.", 404);
    }
    categoryName = category.name;
  }

  const [updated] = await db.update(envelopes).set({
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.categoryId !== undefined ? { categoryId: input.categoryId } : {}),
    ...(input.budgetedAmount !== undefined ? { budgetedAmount: input.budgetedAmount } : {}),
    ...(input.resetFrequency !== undefined ? { resetFrequency: input.resetFrequency } : {}),
    updatedAt: new Date(),
  }).where(and(eq(envelopes.id, id), eq(envelopes.userId, userId))).returning();

  return formatEnvelopeRow(updated, categoryName);
}

export async function fillEnvelope(db: Database, userId: string, id: string, input: FillEnvelopeInput): Promise<EnvelopeItem> {
  const existing = await findEnvelope(db, userId, id);
  if (!existing) {
    throw new ServiceError("NOT_FOUND", "Envelope not found.", 404);
  }

  const availableToSpend = await calculateAvailableToSpend(db, userId);
  if (input.amount > availableToSpend) {
    throw new ServiceError("INSUFFICIENT_AVAILABLE_FUNDS", "Insufficient available funds to fill envelope.", 400);
  }

  const now = new Date();
  await db.batch([
    db.update(envelopes).set({ currentAmount: existing.envelope.currentAmount + input.amount, updatedAt: now }).where(eq(envelopes.id, id)),
    db.insert(transactions).values({
      id: crypto.randomUUID(), userId, accountId: null, envelopeId: null, destinationEnvelopeId: id,
      categoryId: existing.envelope.categoryId, plaidTransactionId: null,
      description: `Fill Envelope: ${existing.envelope.name}`, amount: input.amount, type: "transfer",
      date: now, isManual: true, receiptUrl: null, createdAt: now, updatedAt: now,
    }),
  ]);

  return getEnvelopeById(db, userId, id).then((envelope) => envelope!);
}

export async function transferEnvelopeFunds(db: Database, userId: string, input: TransferEnvelopeInput): Promise<void> {
  const [source, destination] = await Promise.all([
    findEnvelope(db, userId, input.fromEnvelopeId),
    findEnvelope(db, userId, input.toEnvelopeId),
  ]);
  if (!source) throw new ServiceError("NOT_FOUND", "Source envelope not found.", 404);
  if (!destination) throw new ServiceError("NOT_FOUND", "Destination envelope not found.", 404);
  if (source.envelope.currentAmount < input.amount) {
    throw new ServiceError("INSUFFICIENT_ENVELOPE_FUNDS", "Insufficient envelope funds to transfer.", 400);
  }

  const now = new Date();
  await db.batch([
    db.update(envelopes).set({ currentAmount: source.envelope.currentAmount - input.amount, updatedAt: now }).where(eq(envelopes.id, source.envelope.id)),
    db.update(envelopes).set({ currentAmount: destination.envelope.currentAmount + input.amount, updatedAt: now }).where(eq(envelopes.id, destination.envelope.id)),
    db.insert(transactions).values({
      id: crypto.randomUUID(), userId, accountId: null, envelopeId: source.envelope.id, destinationEnvelopeId: destination.envelope.id,
      categoryId: source.envelope.categoryId, plaidTransactionId: null,
      description: `Transfer funds from ${source.envelope.name} to ${destination.envelope.name}`,
      amount: input.amount, type: "transfer", date: now, isManual: true, receiptUrl: null, createdAt: now, updatedAt: now,
    }),
  ]);
}

export async function deleteEnvelope(db: Database, userId: string, id: string, input?: DeleteEnvelopeInput): Promise<void> {
  const existing = await findEnvelope(db, userId, id);
  if (!existing) {
    throw new ServiceError("NOT_FOUND", "Envelope not found.", 404);
  }

  const transferToEnvelopeId = input?.transferToEnvelopeId;
  const returnToAvailableToSpend = input?.returnToAvailableToSpend ?? false;
  if (existing.envelope.currentAmount !== 0 && !transferToEnvelopeId && !returnToAvailableToSpend) {
    throw new ServiceError(
      "ENVELOPE_BALANCE_REQUIRES_ACTION",
      "Choose an envelope to receive the remaining balance or return it to Available to Spend.",
      400,
    );
  }

  if (transferToEnvelopeId) {
    if (transferToEnvelopeId === id) {
      throw new ServiceError("INVALID_INPUT", "Destination envelope must be different.", 400);
    }
    const target = await findEnvelope(db, userId, transferToEnvelopeId);
    if (!target) {
      throw new ServiceError("NOT_FOUND", "Destination envelope not found.", 404);
    }
    await db.batch([
      db.update(envelopes).set({ currentAmount: target.envelope.currentAmount + existing.envelope.currentAmount, updatedAt: new Date() }).where(eq(envelopes.id, target.envelope.id)),
      db.delete(transactions).where(and(eq(transactions.userId, userId), or(eq(transactions.envelopeId, id), eq(transactions.destinationEnvelopeId, id)))),
      db.delete(envelopes).where(and(eq(envelopes.id, id), eq(envelopes.userId, userId))),
    ]);
    return;
  }

  await db.batch([
    db.delete(transactions).where(and(eq(transactions.userId, userId), or(eq(transactions.envelopeId, id), eq(transactions.destinationEnvelopeId, id)))),
    db.delete(envelopes).where(and(eq(envelopes.id, id), eq(envelopes.userId, userId))),
  ]);
}