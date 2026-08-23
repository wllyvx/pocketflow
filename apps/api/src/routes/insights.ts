import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { insightsQuerySchema } from "@pocketflow/shared";
import { createDb } from "../db/client";
import { users } from "../db/schema";
import type { AuthVariables } from "../middleware/auth";
import { ServiceError } from "../services/transaction.service";
import { getInsightsSummary } from "../services/insight.service";

type Bindings = {
  DB?: D1Database;
  DEV_AUTH_TOKEN: string;
  FRONTEND_ORIGIN?: string;
  RECEIPTS_BUCKET?: R2Bucket;
};

const insightsRouter = new Hono<{ Bindings: Bindings; Variables: AuthVariables }>();

insightsRouter.get("/summary", async (context) => {
  const database = context.env.DB ? createDb(context.env.DB) : undefined;
  if (!database) {
    return context.json(
      {
        success: false,
        error: { code: "DATABASE_UNAVAILABLE", message: "D1 Database is not configured." },
      },
      503
    );
  }

  const user = await database
    .select()
    .from(users)
    .where(eq(users.auth0Id, context.get("auth0Id")))
    .limit(1)
    .then((rows) => rows[0]);
  if (!user) {
    return context.json(
      {
        success: false,
        error: { code: "USER_NOT_FOUND", message: "User profile has not been provisioned." },
      },
      404
    );
  }

  const parsedQuery = insightsQuerySchema.safeParse(context.req.query());
  if (!parsedQuery.success) {
    return context.json(
      {
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: parsedQuery.error.issues[0]?.message || "Invalid query parameters.",
        },
      },
      400
    );
  }

  try {
    const summary = await getInsightsSummary(database, user.id, parsedQuery.data);
    return context.json({ success: true, data: summary });
  } catch (error) {
    if (error instanceof ServiceError) {
      return context.json(
        { success: false, error: { code: error.code, message: error.message } },
        error.statusCode as any
      );
    }
    console.error("Failed to build insights summary:", error);
    return context.json(
      {
        success: false,
        error: { code: "INTERNAL_SERVER_ERROR", message: "An unexpected server error occurred." },
      },
      500
    );
  }
});

export default insightsRouter;
