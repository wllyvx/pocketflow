import { Hono } from "hono";
import { cors } from "hono/cors";
import { eq } from "drizzle-orm";
import { onboardingSchema } from "@pocketflow/shared";
import { createDb } from "./db/client";
import { categories, envelopes, transactions, users } from "./db/schema";
import { requireAuth, type AuthVariables } from "./middleware/auth";

type Bindings = {
  DB?: D1Database;
  DEV_AUTH_TOKEN: string;
  FRONTEND_ORIGIN?: string;
  RECEIPTS_BUCKET?: R2Bucket;
};

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
  allowMethods: ["GET", "POST", "OPTIONS"],
}));
app.use("/api/*", requireAuth);
app.get("/api/hello", (context) => context.json({
  success: true,
  data: { message: "PocketFlow API is ready.", userId: context.get("userId") },
}));

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
  }

  return context.json({ success: true, data: user });
});

app.get("/api/dashboard", async (context) => {
  const database = context.env.DB ? createDb(context.env.DB) : undefined;
  if (!database) {
    return context.json({ success: true, data: { availableToSpend: 0, monthlyIncome: 0, spent: 0, healthScore: 0, envelopes: [], transactions: [] } });
  }

  const user = await database.select().from(users).where(eq(users.auth0Id, context.get("auth0Id"))).limit(1).then((rows) => rows[0]);
  if (!user) {
    return context.json({ success: false, error: { code: "USER_NOT_FOUND", message: "Complete your profile setup first." } }, 404);
  }

  const userEnvelopes = await database.select().from(envelopes).where(eq(envelopes.userId, user.id));
  const userTransactions = await database.select().from(transactions).where(eq(transactions.userId, user.id)).limit(10);
  const monthlyIncome = userTransactions.filter((transaction) => transaction.type === "income").reduce((total, transaction) => total + transaction.amount, 0);
  const spent = userTransactions.filter((transaction) => transaction.type === "expense").reduce((total, transaction) => total + transaction.amount, 0);
  const availableToSpend = userEnvelopes.reduce((total, envelope) => total + envelope.currentAmount, 0);
  const healthScore = userEnvelopes.length === 0 ? 0 : Math.round((userEnvelopes.filter((envelope) => envelope.currentAmount <= envelope.budgetedAmount).length / userEnvelopes.length) * 100);

  return context.json({
    success: true,
    data: {
      availableToSpend, monthlyIncome, spent, healthScore,
      envelopes: userEnvelopes,
      transactions: userTransactions,
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
      const category = await database.select().from(categories).where(eq(categories.name, name)).limit(1).then((rows) => rows[0]);
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

  const updated = await database.update(users).set({ onboardingStatus: status, updatedAt: new Date() }).where(eq(users.id, user.id)).returning();
  return context.json({ success: true, data: { status: updated[0].onboardingStatus } });
});

export default app;
