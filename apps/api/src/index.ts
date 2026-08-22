import { Hono } from "hono";
import { cors } from "hono/cors";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { onboardingSchema } from "@pocketflow/shared";
import { createDb } from "./db/client";
import { categories, envelopes, transactions, users } from "./db/schema";
import { requireAuth, type AuthVariables } from "./middleware/auth";
import transactionsRouter from "./routes/transactions";
import receiptsRouter from "./routes/receipts";
import envelopesRouter from "./routes/envelopes";
import { calculateAvailableToSpend, listEnvelopes } from "./services/envelope.service";

export type Bindings = {
  DB?: D1Database;
  DEV_AUTH_TOKEN: string;
  FRONTEND_ORIGIN?: string;
  RECEIPTS_BUCKET?: R2Bucket;
};

function isUniqueConstraintError(error: unknown) {
  return error instanceof Error && /unique constraint|UNIQUE constraint/i.test(error.message);
}

const app = new Hono<{ Bindings: Bindings; Variables: AuthVariables }>();

app.get("/health", (context) => context.json({ success: true, data: { service: "api", status: "ok" } }));

app.use("/api/*", cors({
  origin: (origin, context) => {
    const allowedOrigin = context.env.FRONTEND_ORIGIN;
    if (allowedOrigin && origin === allowedOrigin) return origin;
    if (!allowedOrigin && [
      "http://localhost:4321",
      "http://localhost:4322",
      "http://127.0.0.1:4321",
      "http://127.0.0.1:4322",
    ].includes(origin)) return origin;
    return "";
  },
  allowHeaders: ["Authorization", "Content-Type"],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
}));

app.use("/api/*", requireAuth);

app.get("/api/hello", (context) => context.json({
  success: true,
  data: { message: "PocketFlow API is ready.", userId: context.get("userId") },
}));

// Mount transactions router
app.route("/api/transactions", transactionsRouter);
app.route("/api/envelopes", envelopesRouter);

app.get("/api/users/me", async (context) => {
  const now = new Date();
  const auth0Id = context.get("auth0Id");
  const database = context.env.DB ? createDb(context.env.DB) : undefined;

  if (!database) {
    return context.json({
      success: true,
      data: {
        id: context.get("userId"),
        auth0Id,
        email: context.get("email"),
        name: context.get("name") ?? "PocketFlow User",
        onboardingStatus: "pending",
      },
    });
  }

  let user = await database.select().from(users).where(eq(users.auth0Id, auth0Id)).limit(1).then((rows) => rows[0]);
  if (!user) {
    try {
      const inserted = await database.insert(users).values({
        id: crypto.randomUUID(),
        auth0Id,
        email: context.get("email") ?? `${auth0Id}@users.invalid`,
        name: context.get("name") ?? "PocketFlow User",
        onboardingStatus: "pending",
        createdAt: now,
        updatedAt: now,
      }).returning();
      user = inserted[0];
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        return context.json({ success: false, error: { code: "DUPLICATE_EMAIL", message: "An account with this email already exists. Sign in with that account instead." } }, 409);
      }
      throw error;
    }
  }

  return context.json({ success: true, data: user });
});

app.get("/api/dashboard", async (context) => {
  const database = context.env.DB ? createDb(context.env.DB) : undefined;
  if (!database) {
    return context.json({
      success: true,
      data: {
        availableToSpend: 0,
        monthlyIncome: 0,
        spent: 0,
        healthScore: 0,
        envelopes: [],
        transactions: [],
      },
    });
  }

  const user = await database
    .select()
    .from(users)
    .where(eq(users.auth0Id, context.get("auth0Id")))
    .limit(1)
    .then((rows) => rows[0]);

  if (!user) {
    return context.json(
      { success: false, error: { code: "USER_NOT_FOUND", message: "Complete your profile setup first." } },
      404
    );
  }

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  // TODO: Optimize N+1 query pattern in listEnvelopes if performance becomes issue
  const [userEnvelopes, monthTransactions, recentTransactions, availableToSpend] = await Promise.all([
    listEnvelopes(database, user.id),
    database
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, user.id),
          gte(transactions.date, startOfMonth),
          lte(transactions.date, endOfMonth)
        )
      ),
    database
      .select({
        transaction: transactions,
        envelopeName: envelopes.name,
      })
      .from(transactions)
      .leftJoin(envelopes, eq(transactions.envelopeId, envelopes.id))
      .where(eq(transactions.userId, user.id))
      .orderBy(desc(transactions.date), desc(transactions.createdAt))
      .limit(10),
    calculateAvailableToSpend(database, user.id),
  ]);

  const monthlyIncome = monthTransactions
    .filter((tx) => tx.type === "income")
    .reduce((total, tx) => total + tx.amount, 0);

  const spent = monthTransactions
    .filter((tx) => tx.type === "expense")
    .reduce((total, tx) => total + tx.amount, 0);

  const healthScore =
    userEnvelopes.length === 0
      ? 0
      : Math.round(
          (userEnvelopes.filter((env) => env.currentAmount >= 0).length /
            userEnvelopes.length) *
            100
        );

  const mappedTransactions = recentTransactions.map((r) => ({
    id: r.transaction.id,
    userId: r.transaction.userId,
    type: r.transaction.type,
    amount: r.transaction.amount,
    description: r.transaction.description,
    date:
      r.transaction.date instanceof Date
        ? r.transaction.date.toISOString()
        : new Date(r.transaction.date).toISOString(),
    envelopeId: r.transaction.envelopeId,
    destinationEnvelopeId: r.transaction.destinationEnvelopeId,
    receiptImageUrl: r.transaction.receiptUrl,
    envelopeName: r.envelopeName ?? null,
    isManual: Boolean(r.transaction.isManual),
    createdAt:
      r.transaction.createdAt instanceof Date
        ? r.transaction.createdAt.toISOString()
        : new Date(r.transaction.createdAt).toISOString(),
  }));

  return context.json({
    success: true,
    data: {
      availableToSpend,
      monthlyIncome,
      spent,
      healthScore,
      envelopes: userEnvelopes,
      transactions: mappedTransactions,
    },
  });
});

app.get("/api/onboarding", async (context) => {
  const database = context.env.DB ? createDb(context.env.DB) : undefined;
  if (!database) {
    return context.json({ success: true, data: { status: "pending", canSkip: true } });
  }

  const user = await database.select().from(users).where(eq(users.auth0Id, context.get("auth0Id"))).limit(1).then((rows) => rows[0]);
  if (!user) {
    return context.json({ success: false, error: { code: "USER_NOT_FOUND", message: "User profile has not been provisioned." } }, 404);
  }

  return context.json({ success: true, data: { status: user.onboardingStatus, canSkip: user.onboardingStatus === "pending" } });
});

app.post("/api/onboarding", async (context) => {
  const database = context.env.DB ? createDb(context.env.DB) : undefined;
  if (!database) {
    return context.json({ success: false, error: { code: "DATABASE_UNAVAILABLE", message: "Onboarding requires a configured D1 database." } }, 503);
  }

  const user = await database.select().from(users).where(eq(users.auth0Id, context.get("auth0Id"))).limit(1).then((rows) => rows[0]);
  if (!user) {
    return context.json({ success: false, error: { code: "USER_NOT_FOUND", message: "Complete your profile setup first." } }, 404);
  }
  if (user.onboardingStatus !== "pending") {
    return context.json({ success: false, error: { code: "ONBOARDING_COMPLETE", message: "Onboarding has already been completed." } }, 409);
  }

  const body = onboardingSchema.safeParse(await context.req.json().catch(() => null));
  if (!body.success) {
    return context.json({ success: false, error: { code: "INVALID_INPUT", message: "Onboarding selections are invalid." } }, 400);
  }

  const status = body.data.skip ? "skipped" : "completed";
  if (!body.data.skip) {
    for (const name of body.data.starterEnvelopes) {
      const category = await database.select().from(categories).where(and(eq(categories.userId, user.id), eq(categories.name, name))).limit(1).then((rows) => rows[0]);
      const categoryId = category?.id ?? crypto.randomUUID();
      if (!category) {
        await database.insert(categories).values({ id: categoryId, userId: user.id, name, type: "expense", createdAt: new Date(), updatedAt: new Date() });
      }
      await database.insert(envelopes).values({
        id: crypto.randomUUID(), userId: user.id, categoryId, name,
        budgetedAmount: 0, currentAmount: 0, resetFrequency: "monthly",
        lastResetDate: new Date(), createdAt: new Date(), updatedAt: new Date(),
      }).onConflictDoNothing();
    }
  }

  const updated = await database.update(users).set({ name: body.data.displayName, onboardingStatus: status, updatedAt: new Date() }).where(eq(users.id, user.id)).returning();
  return context.json({ success: true, data: { status: updated[0].onboardingStatus } });
});

export default app;
