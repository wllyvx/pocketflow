import { beforeEach, describe, expect, it } from "vitest";
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import * as schema from "../db/schema";
import { createFakeBucket } from "../test/fakes";
import { deleteTransaction } from "./transaction.service";
import { serveReceipt, uploadReceipt } from "./receipt.service";

const JPEG_MAGIC = [0xff, 0xd8, 0xff, 0xe0];

function receiptFile() {
  const content = new Uint8Array([...JPEG_MAGIC, ...new Array(16).fill(0x00)]);
  return new File([content as BlobPart], "receipt.jpg", { type: "image/jpeg" });
}

describe("FR-07 #04 transaction deletion cleans up receipts", () => {
  let sqlite: Database.Database;
  let db: ReturnType<typeof drizzle>;
  const userId = "user-1";
  const now = Date.now();

  function seedTransaction(
    id: string,
    overrides: Partial<typeof schema.transactions.$inferInsert> = {}
  ) {
    db.insert(schema.users)
      .values({
        id: userId,
        auth0Id: "auth0|1",
        email: "user-1@test.com",
        name: "User One",
        createdAt: new Date(now),
        updatedAt: new Date(now),
      })
      .onConflictDoNothing()
      .run();
    db.insert(schema.categories)
      .values({
        id: "cat-1",
        userId,
        name: `cat-${userId}`,
        type: "expense",
        createdAt: new Date(now),
        updatedAt: new Date(now),
      })
      .onConflictDoNothing()
      .run();
    db.insert(schema.envelopes)
      .values({
        id: "env-1",
        userId,
        categoryId: "cat-1",
        name: "Groceries",
        budgetedAmount: 100,
        currentAmount: 100,
        resetFrequency: "monthly",
        lastResetDate: new Date(now),
        createdAt: new Date(now),
        updatedAt: new Date(now),
      })
      .onConflictDoNothing()
      .run();
    db.insert(schema.transactions)
      .values({
        id,
        userId,
        envelopeId: "env-1",
        description: "Test",
        amount: 10,
        type: "expense",
        date: new Date(now),
        isManual: true,
        createdAt: new Date(now),
        updatedAt: new Date(now),
        ...overrides,
      })
      .run();
  }

  beforeEach(() => {
    sqlite = new Database(":memory:");
    db = drizzle(sqlite, { schema });
    sqlite.exec(`
      CREATE TABLE users (
        id TEXT PRIMARY KEY NOT NULL,
        auth0_id TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        onboarding_status TEXT NOT NULL DEFAULT 'pending',
        current_streak INTEGER NOT NULL DEFAULT 0,
        last_activity_date INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE categories (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT REFERENCES users(id),
        name TEXT NOT NULL UNIQUE,
        type TEXT NOT NULL,
        icon TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE envelopes (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL REFERENCES users(id),
        category_id TEXT NOT NULL REFERENCES categories(id),
        name TEXT NOT NULL,
        budgeted_amount REAL NOT NULL,
        current_amount REAL NOT NULL,
        reset_frequency TEXT NOT NULL,
        last_reset_date INTEGER NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
      CREATE TABLE transactions (
        id TEXT PRIMARY KEY NOT NULL,
        user_id TEXT NOT NULL REFERENCES users(id),
        account_id TEXT,
        envelope_id TEXT REFERENCES envelopes(id),
        destination_envelope_id TEXT REFERENCES envelopes(id),
        category_id TEXT REFERENCES categories(id),
        plaid_transaction_id TEXT UNIQUE,
        description TEXT NOT NULL,
        amount REAL NOT NULL,
        type TEXT NOT NULL,
        date INTEGER NOT NULL,
        is_manual INTEGER NOT NULL,
        receipt_url TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );
    `);
  });

  it("deletes the R2 object when the deleted transaction has a receipt", async () => {
    const bucket = createFakeBucket();
    const { key } = await uploadReceipt(bucket, userId, receiptFile());
    seedTransaction("tx-1", { receiptUrl: `/api/receipts/${key}` });

    await expect(
      deleteTransaction(db as any, userId, "tx-1", bucket)
    ).resolves.toBeUndefined();

    await expect(serveReceipt(bucket, userId, key))
      .rejects.toMatchObject({ code: "RECEIPT_NOT_FOUND" });
  });

  it("performs no storage side effects when the transaction has no receipt", async () => {
    const bucket = createFakeBucket();
    const { key } = await uploadReceipt(bucket, userId, receiptFile());
    seedTransaction("tx-2");

    await expect(deleteTransaction(db as any, userId, "tx-2", bucket)).resolves.toBeUndefined();

    await expect(serveReceipt(bucket, userId, key)).resolves.toBeTruthy();
  });

  it("still deletes the transaction row and reverts envelope balance", async () => {
    const bucket = createFakeBucket();
    const { key } = await uploadReceipt(bucket, userId, receiptFile());
    seedTransaction("tx-3", { amount: 30, receiptUrl: `/api/receipts/${key}` });

    await deleteTransaction(db as any, userId, "tx-3", bucket);

    const rows = db.select().from(schema.transactions).all();
    expect(rows).toHaveLength(0);
    const [envelope] = db.select().from(schema.envelopes).all();
    expect(envelope.currentAmount).toBe(130);
  });
});
