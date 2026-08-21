/// <reference types="vitest" />
import { describe, expect, it } from "vitest";
import { deleteEnvelopeSchema, createEnvelopeSchema } from "@pocketflow/shared";
import { deleteEnvelope, getEnvelopeDeletePreview } from "./envelope.service";

function createReadDatabase(envelope: Record<string, unknown>, relatedCount = 0) {
  const select = () => {
    const query = {
      from: () => query,
      leftJoin: () => query,
      where: () => query,
      limit: async () => [{ envelope, categoryName: "Groceries" }],
    };
    return query;
  };
  const countSelect = () => {
    const query = {
      from: () => query,
      where: () => query,
      then: (resolve: (value: unknown[]) => unknown) => Promise.resolve(resolve([{ relatedTransactionCount: relatedCount }])),
    };
    return query;
  };
  return { select: relatedCount === -1 ? select : (() => { let calls = 0; return () => { calls += 1; return calls === 1 ? select() : countSelect(); }; })(), delete: () => ({ where: async () => undefined }), transaction: async () => undefined } as any;
}

const envelope = {
  id: "env-1", userId: "user-1", categoryId: "cat-1", name: "Groceries",
  budgetedAmount: 500, currentAmount: 250, resetFrequency: "monthly",
  lastResetDate: new Date(), createdAt: new Date(), updatedAt: new Date(),
};

describe("FR-03 envelope contract", () => {
  it("defaults new envelopes to monthly reset", () => {
    const parsed = createEnvelopeSchema.parse({ name: "Groceries", categoryId: "cat-1", budgetedAmount: 500 });
    expect(parsed.resetFrequency).toBe("monthly");
    expect(parsed.budgetedAmount).toBe(500);
  });

  it("rejects conflicting delete actions", () => {
    const parsed = deleteEnvelopeSchema.safeParse({ transferToEnvelopeId: "env-2", returnToAvailableToSpend: true });
    expect(parsed.success).toBe(false);
  });

  it("requires an explicit action for a non-zero balance", async () => {
    await expect(deleteEnvelope(createReadDatabase(envelope, -1), "user-1", "env-1", { returnToAvailableToSpend: false }))
      .rejects.toMatchObject({ code: "ENVELOPE_BALANCE_REQUIRES_ACTION", statusCode: 400 });
  });

  it("returns delete preview data scoped to the envelope owner", async () => {
    const preview = await getEnvelopeDeletePreview(createReadDatabase(envelope), "user-1", "env-1");
    expect(preview).toEqual({ envelopeId: "env-1", currentAmount: 250, relatedTransactionCount: 0, requiresBalanceAction: true });
  });
});