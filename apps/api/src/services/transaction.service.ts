import { and, count, desc, eq, gte, lte, or } from "drizzle-orm";
import type {
  CreateTransactionInput,
  ListTransactionsQuery,
  TransactionItem,
  TransactionType,
  UpdateTransactionInput,
} from "@pocketflow/shared";
import type { createDb } from "../db/client";
import { envelopes, transactions } from "../db/schema";

type Database = ReturnType<typeof createDb>;

export class ServiceError extends Error {
  code: string;
  statusCode: number;

  constructor(code: string, message: string, statusCode = 400) {
    super(message);
    this.name = "ServiceError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

function formatTransactionRow(
  tx: typeof transactions.$inferSelect,
  envelopeName?: string | null
): TransactionItem {
  return {
    id: tx.id,
    userId: tx.userId,
    type: tx.type as TransactionType,
    amount: tx.amount,
    description: tx.description,
    date: tx.date instanceof Date ? tx.date.toISOString() : new Date(tx.date).toISOString(),
    envelopeId: tx.envelopeId,
    destinationEnvelopeId: tx.destinationEnvelopeId,
    sourceAccountId: tx.accountId,
    destinationAccountId: null,
    receiptImageUrl: tx.receiptUrl,
    envelopeName: envelopeName ?? null,
    envelopeColorHex: null,
    isManual: Boolean(tx.isManual),
    createdAt: tx.createdAt instanceof Date ? tx.createdAt.toISOString() : new Date(tx.createdAt).toISOString(),
    updatedAt: tx.updatedAt
      ? tx.updatedAt instanceof Date
        ? tx.updatedAt.toISOString()
        : new Date(tx.updatedAt).toISOString()
      : undefined,
  };
}

export async function listTransactions(
  db: Database,
  userId: string,
  query: ListTransactionsQuery
): Promise<{
  items: TransactionItem[];
  pagination: {
    totalItems: number;
    totalPages: number;
    currentPage: number;
    itemsPerPage: number;
  };
}> {
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(50, Math.max(1, query.limit || 10));
  const offset = (page - 1) * limit;

  const conditions = [eq(transactions.userId, userId)];

  if (query.type) {
    conditions.push(eq(transactions.type, query.type));
  }

  if (query.envelopeId) {
    conditions.push(
      or(
        eq(transactions.envelopeId, query.envelopeId),
        eq(transactions.destinationEnvelopeId, query.envelopeId)
      )!
    );
  }

  if (query.startDate) {
    const startDate = new Date(query.startDate);
    if (!isNaN(startDate.getTime())) {
      conditions.push(gte(transactions.date, startDate));
    }
  }

  if (query.endDate) {
    const endDate = new Date(query.endDate);
    if (!isNaN(endDate.getTime())) {
      conditions.push(lte(transactions.date, endDate));
    }
  }

  const whereClause = and(...conditions);

  const countResult = await db
    .select({ total: count() })
    .from(transactions)
    .where(whereClause);
  const totalItems = countResult[0]?.total ?? 0;
  const totalPages = totalItems === 0 ? 0 : Math.ceil(totalItems / limit);

  const rows = await db
    .select({
      transaction: transactions,
      envelopeName: envelopes.name,
    })
    .from(transactions)
    .leftJoin(envelopes, eq(transactions.envelopeId, envelopes.id))
    .where(whereClause)
    .orderBy(desc(transactions.date), desc(transactions.createdAt))
    .limit(limit)
    .offset(offset);

  const items = rows.map((r) => formatTransactionRow(r.transaction, r.envelopeName));

  return {
    items,
    pagination: {
      totalItems,
      totalPages,
      currentPage: page,
      itemsPerPage: limit,
    },
  };
}

export async function getTransactionById(
  db: Database,
  userId: string,
  id: string
): Promise<TransactionItem | null> {
  const rows = await db
    .select({
      transaction: transactions,
      envelopeName: envelopes.name,
    })
    .from(transactions)
    .leftJoin(envelopes, eq(transactions.envelopeId, envelopes.id))
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
    .limit(1);

  if (rows.length === 0) {
    return null;
  }

  return formatTransactionRow(rows[0].transaction, rows[0].envelopeName);
}

export async function createTransaction(
  db: Database,
  userId: string,
  input: CreateTransactionInput
): Promise<TransactionItem> {
  const now = new Date();
  const txDate = new Date(input.date);

  let categoryId: string | null = null;
  let envelopeName: string | null = null;

  if (input.type === "expense") {
    if (!input.envelopeId) {
      throw new ServiceError("INVALID_INPUT", "Envelope is required for expense transactions.", 400);
    }
    const [envelope] = await db
      .select()
      .from(envelopes)
      .where(and(eq(envelopes.id, input.envelopeId), eq(envelopes.userId, userId)))
      .limit(1);

    if (!envelope) {
      throw new ServiceError("NOT_FOUND", "Envelope not found.", 404);
    }

    envelopeName = envelope.name;
    categoryId = envelope.categoryId;

    // Deduct amount (allows negative balance for overspending)
    await db
      .update(envelopes)
      .set({
        currentAmount: envelope.currentAmount - input.amount,
        updatedAt: now,
      })
      .where(eq(envelopes.id, envelope.id));
  } else if (input.type === "income") {
    // Income transactions should NOT directly modify envelope balance
    // They only contribute to "Available to Spend" pool
    // Users must use "Fill Envelope" feature to allocate income to envelopes
    if (input.envelopeId) {
      throw new ServiceError(
        "INVALID_INPUT",
        "Income transactions cannot be assigned to an envelope. Use Fill Envelope feature instead.",
        400
      );
    }
  } else if (input.type === "transfer") {
    if (!input.envelopeId || !input.destinationEnvelopeId) {
      throw new ServiceError(
        "INVALID_INPUT",
        "Transfers require source and destination envelopes.",
        400
      );
    }
    if (
      input.envelopeId &&
      input.destinationEnvelopeId &&
      input.envelopeId === input.destinationEnvelopeId
    ) {
      throw new ServiceError(
        "INVALID_INPUT",
        "Source and destination envelopes must be different.",
        400
      );
    }

    if (input.envelopeId) {
      const [sourceEnvelope] = await db
        .select()
        .from(envelopes)
        .where(and(eq(envelopes.id, input.envelopeId), eq(envelopes.userId, userId)))
        .limit(1);

      if (!sourceEnvelope) {
        throw new ServiceError("NOT_FOUND", "Source envelope not found.", 404);
      }

      envelopeName = sourceEnvelope.name;
      categoryId = sourceEnvelope.categoryId;

      await db
        .update(envelopes)
        .set({
          currentAmount: sourceEnvelope.currentAmount - input.amount,
          updatedAt: now,
        })
        .where(eq(envelopes.id, sourceEnvelope.id));
    }

    if (input.destinationEnvelopeId) {
      const [destEnvelope] = await db
        .select()
        .from(envelopes)
        .where(and(eq(envelopes.id, input.destinationEnvelopeId), eq(envelopes.userId, userId)))
        .limit(1);

      if (!destEnvelope) {
        throw new ServiceError("NOT_FOUND", "Destination envelope not found.", 404);
      }

      await db
        .update(envelopes)
        .set({
          currentAmount: destEnvelope.currentAmount + input.amount,
          updatedAt: now,
        })
        .where(eq(envelopes.id, destEnvelope.id));
    }
  }

  const txId = crypto.randomUUID();
  const receiptUrl =
    input.receiptImageUrl && input.receiptImageUrl.trim() !== ""
      ? input.receiptImageUrl.trim()
      : null;

  const [inserted] = await db
    .insert(transactions)
    .values({
      id: txId,
      userId,
      accountId: input.sourceAccountId ?? null,
      envelopeId: input.envelopeId ?? null,
      destinationEnvelopeId: input.destinationEnvelopeId ?? null,
      categoryId,
      plaidTransactionId: null,
      description: input.description.trim(),
      amount: input.amount,
      type: input.type,
      date: txDate,
      isManual: true,
      receiptUrl,
      createdAt: now,
      updatedAt: now,
    })
    .returning();

  return formatTransactionRow(inserted, envelopeName);
}

export async function updateTransaction(
  db: Database,
  userId: string,
  id: string,
  input: UpdateTransactionInput
): Promise<TransactionItem> {
  const [existing] = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
    .limit(1);

  if (!existing) {
    throw new ServiceError("NOT_FOUND", "Transaction not found.", 404);
  }

  const targetType = input.type ?? (existing.type as TransactionType);
  const targetAmount = input.amount !== undefined ? input.amount : existing.amount;
  const targetEnvelopeId =
    input.envelopeId !== undefined ? input.envelopeId : existing.envelopeId;
  const targetDestEnvelopeId =
    input.destinationEnvelopeId !== undefined
      ? input.destinationEnvelopeId
      : existing.destinationEnvelopeId;
  const targetDescription = input.description ?? existing.description;
  const targetDate = input.date
    ? new Date(input.date)
    : existing.date instanceof Date
      ? existing.date
      : new Date(existing.date);
  const targetReceiptUrl =
    input.receiptImageUrl !== undefined
      ? input.receiptImageUrl && input.receiptImageUrl.trim() !== ""
        ? input.receiptImageUrl.trim()
        : null
      : existing.receiptUrl;

  if (targetType === "expense" && !targetEnvelopeId) {
    throw new ServiceError("INVALID_INPUT", "Envelope is required for expense transactions.", 400);
  }

  if (
    targetType === "transfer" &&
    (!targetEnvelopeId || !targetDestEnvelopeId || targetEnvelopeId === targetDestEnvelopeId)
  ) {
    throw new ServiceError(
      "INVALID_INPUT",
      !targetEnvelopeId || !targetDestEnvelopeId
        ? "Transfers require source and destination envelopes."
        : "Source and destination envelopes must be different.",
      400
    );
  }

  // Verify target envelopes exist and belong to user
  if (targetEnvelopeId) {
    const [env] = await db
      .select()
      .from(envelopes)
      .where(and(eq(envelopes.id, targetEnvelopeId), eq(envelopes.userId, userId)))
      .limit(1);
    if (!env) {
      throw new ServiceError("NOT_FOUND", "Envelope not found.", 404);
    }
  }

  if (targetDestEnvelopeId) {
    const [destEnv] = await db
      .select()
      .from(envelopes)
      .where(and(eq(envelopes.id, targetDestEnvelopeId), eq(envelopes.userId, userId)))
      .limit(1);
    if (!destEnv) {
      throw new ServiceError("NOT_FOUND", "Destination envelope not found.", 404);
    }
  }

  // Calculate balance deltas for affected envelopes
  const deltaMap: Record<string, number> = {};

  // 1. Revert existing transaction impact
  if (existing.type === "expense" && existing.envelopeId) {
    deltaMap[existing.envelopeId] = (deltaMap[existing.envelopeId] || 0) + existing.amount;
  } else if (existing.type === "income" && existing.envelopeId) {
    deltaMap[existing.envelopeId] = (deltaMap[existing.envelopeId] || 0) - existing.amount;
  } else if (existing.type === "transfer") {
    if (existing.envelopeId) {
      deltaMap[existing.envelopeId] = (deltaMap[existing.envelopeId] || 0) + existing.amount;
    }
    if (existing.destinationEnvelopeId) {
      deltaMap[existing.destinationEnvelopeId] =
        (deltaMap[existing.destinationEnvelopeId] || 0) - existing.amount;
    }
  }

  // 2. Apply new transaction impact
  if (targetType === "expense" && targetEnvelopeId) {
    deltaMap[targetEnvelopeId] = (deltaMap[targetEnvelopeId] || 0) - targetAmount;
  } else if (targetType === "income" && targetEnvelopeId) {
    deltaMap[targetEnvelopeId] = (deltaMap[targetEnvelopeId] || 0) + targetAmount;
  } else if (targetType === "transfer") {
    if (targetEnvelopeId) {
      deltaMap[targetEnvelopeId] = (deltaMap[targetEnvelopeId] || 0) - targetAmount;
    }
    if (targetDestEnvelopeId) {
      deltaMap[targetDestEnvelopeId] = (deltaMap[targetDestEnvelopeId] || 0) + targetAmount;
    }
  }

  const now = new Date();

  // 3. Apply envelope updates
  for (const [envId, delta] of Object.entries(deltaMap)) {
    if (delta !== 0) {
      const [env] = await db
        .select()
        .from(envelopes)
        .where(and(eq(envelopes.id, envId), eq(envelopes.userId, userId)))
        .limit(1);
      if (env) {
        await db
          .update(envelopes)
          .set({
            currentAmount: env.currentAmount + delta,
            updatedAt: now,
          })
          .where(eq(envelopes.id, envId));
      }
    }
  }

  // 4. Update transaction row
  const [updated] = await db
    .update(transactions)
    .set({
      type: targetType,
      amount: targetAmount,
      description: targetDescription.trim(),
      date: targetDate,
      envelopeId: targetEnvelopeId ?? null,
      destinationEnvelopeId: targetDestEnvelopeId ?? null,
      receiptUrl: targetReceiptUrl,
      updatedAt: now,
    })
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
    .returning();

  let envelopeName: string | null = null;
  if (updated.envelopeId) {
    const [env] = await db
      .select({ name: envelopes.name })
      .from(envelopes)
      .where(eq(envelopes.id, updated.envelopeId))
      .limit(1);
    envelopeName = env?.name ?? null;
  }

  return formatTransactionRow(updated, envelopeName);
}

export async function deleteTransaction(
  db: Database,
  userId: string,
  id: string
): Promise<void> {
  const [existing] = await db
    .select()
    .from(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)))
    .limit(1);

  if (!existing) {
    throw new ServiceError("NOT_FOUND", "Transaction not found.", 404);
  }

  const now = new Date();

  // Revert balance impact
  if (existing.type === "expense" && existing.envelopeId) {
    const [env] = await db
      .select()
      .from(envelopes)
      .where(and(eq(envelopes.id, existing.envelopeId), eq(envelopes.userId, userId)))
      .limit(1);
    if (env) {
      await db
        .update(envelopes)
        .set({
          currentAmount: env.currentAmount + existing.amount,
          updatedAt: now,
        })
        .where(eq(envelopes.id, env.id));
    }
  } else if (existing.type === "income" && existing.envelopeId) {
    const [env] = await db
      .select()
      .from(envelopes)
      .where(and(eq(envelopes.id, existing.envelopeId), eq(envelopes.userId, userId)))
      .limit(1);
    if (env) {
      await db
        .update(envelopes)
        .set({
          currentAmount: env.currentAmount - existing.amount,
          updatedAt: now,
        })
        .where(eq(envelopes.id, env.id));
    }
  } else if (existing.type === "transfer") {
    if (existing.envelopeId) {
      const [sourceEnv] = await db
        .select()
        .from(envelopes)
        .where(and(eq(envelopes.id, existing.envelopeId), eq(envelopes.userId, userId)))
        .limit(1);
      if (sourceEnv) {
        await db
          .update(envelopes)
          .set({
            currentAmount: sourceEnv.currentAmount + existing.amount,
            updatedAt: now,
          })
          .where(eq(envelopes.id, sourceEnv.id));
      }
    }
    if (existing.destinationEnvelopeId) {
      const [destEnv] = await db
        .select()
        .from(envelopes)
        .where(and(eq(envelopes.id, existing.destinationEnvelopeId), eq(envelopes.userId, userId)))
        .limit(1);
      if (destEnv) {
        await db
          .update(envelopes)
          .set({
            currentAmount: destEnv.currentAmount - existing.amount,
            updatedAt: now,
          })
          .where(eq(envelopes.id, destEnv.id));
      }
    }
  }

  // Delete transaction record
  await db
    .delete(transactions)
    .where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
}
