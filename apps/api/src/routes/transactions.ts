import { Hono } from "hono";
import { eq } from "drizzle-orm";
import {
  createTransactionSchema,
  listTransactionsQuerySchema,
  updateTransactionSchema,
} from "@pocketflow/shared";
import { createDb } from "../db/client";
import { users } from "../db/schema";
import type { AuthVariables } from "../middleware/auth";
import {
  createTransaction,
  deleteTransaction,
  getTransactionById,
  listTransactions,
  ServiceError,
  updateTransaction,
} from "../services/transaction.service";

type Bindings = {
  DB?: D1Database;
  DEV_AUTH_TOKEN: string;
  FRONTEND_ORIGIN?: string;
  RECEIPTS_BUCKET?: R2Bucket;
};

const transactionsRouter = new Hono<{ Bindings: Bindings; Variables: AuthVariables }>();

// Helper to resolve user from auth0Id
async function getUser(database: ReturnType<typeof createDb>, auth0Id: string) {
  return database
    .select()
    .from(users)
    .where(eq(users.auth0Id, auth0Id))
    .limit(1)
    .then((rows) => rows[0]);
}

// GET / - List transactions
transactionsRouter.get("/", async (context) => {
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

  const user = await getUser(database, context.get("auth0Id"));
  if (!user) {
    return context.json(
      {
        success: false,
        error: { code: "USER_NOT_FOUND", message: "User profile has not been provisioned." },
      },
      404
    );
  }

  const queryParams = context.req.query();
  const parsedQuery = listTransactionsQuerySchema.safeParse(queryParams);
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
    const result = await listTransactions(database, user.id, parsedQuery.data);
    return context.json({
      success: true,
      data: result.items,
      pagination: result.pagination,
    });
  } catch (error) {
    if (error instanceof ServiceError) {
      return context.json(
        { success: false, error: { code: error.code, message: error.message } },
        error.statusCode as any
      );
    }
    console.error("Failed to list transactions:", error);
    return context.json(
      {
        success: false,
        error: { code: "INTERNAL_SERVER_ERROR", message: "An unexpected server error occurred." },
      },
      500
    );
  }
});

// POST / - Create transaction
transactionsRouter.post("/", async (context) => {
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

  const user = await getUser(database, context.get("auth0Id"));
  if (!user) {
    return context.json(
      {
        success: false,
        error: { code: "USER_NOT_FOUND", message: "User profile has not been provisioned." },
      },
      404
    );
  }

  const body = await context.req.json().catch(() => null);
  const parsed = createTransactionSchema.safeParse(body);
  if (!parsed.success) {
    return context.json(
      {
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: parsed.error.issues[0]?.message || "Invalid transaction input.",
        },
      },
      400
    );
  }

  try {
    const transaction = await createTransaction(database, user.id, parsed.data);
    return context.json(
      {
        success: true,
        data: transaction,
      },
      201
    );
  } catch (error) {
    if (error instanceof ServiceError) {
      return context.json(
        { success: false, error: { code: error.code, message: error.message } },
        error.statusCode as any
      );
    }
    console.error("Failed to create transaction:", error);
    return context.json(
      {
        success: false,
        error: { code: "INTERNAL_SERVER_ERROR", message: "An unexpected server error occurred." },
      },
      500
    );
  }
});

// GET /:id - Get single transaction
transactionsRouter.get("/:id", async (context) => {
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

  const user = await getUser(database, context.get("auth0Id"));
  if (!user) {
    return context.json(
      {
        success: false,
        error: { code: "USER_NOT_FOUND", message: "User profile has not been provisioned." },
      },
      404
    );
  }

  const id = context.req.param("id");
  try {
    const transaction = await getTransactionById(database, user.id, id);
    if (!transaction) {
      return context.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "Transaction not found." },
        },
        404
      );
    }

    return context.json({
      success: true,
      data: transaction,
    });
  } catch (error) {
    if (error instanceof ServiceError) {
      return context.json(
        { success: false, error: { code: error.code, message: error.message } },
        error.statusCode as any
      );
    }
    console.error("Failed to fetch transaction:", error);
    return context.json(
      {
        success: false,
        error: { code: "INTERNAL_SERVER_ERROR", message: "An unexpected server error occurred." },
      },
      500
    );
  }
});

// PUT /:id - Update transaction
transactionsRouter.put("/:id", async (context) => {
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

  const user = await getUser(database, context.get("auth0Id"));
  if (!user) {
    return context.json(
      {
        success: false,
        error: { code: "USER_NOT_FOUND", message: "User profile has not been provisioned." },
      },
      404
    );
  }

  const id = context.req.param("id");
  const body = await context.req.json().catch(() => null);
  const parsed = updateTransactionSchema.safeParse(body);
  if (!parsed.success) {
    return context.json(
      {
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: parsed.error.issues[0]?.message || "Invalid update input.",
        },
      },
      400
    );
  }

  try {
    const updated = await updateTransaction(database, user.id, id, parsed.data);
    return context.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    if (error instanceof ServiceError) {
      return context.json(
        { success: false, error: { code: error.code, message: error.message } },
        error.statusCode as any
      );
    }
    console.error("Failed to update transaction:", error);
    return context.json(
      {
        success: false,
        error: { code: "INTERNAL_SERVER_ERROR", message: "An unexpected server error occurred." },
      },
      500
    );
  }
});

// DELETE /:id - Delete transaction
transactionsRouter.delete("/:id", async (context) => {
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

  const user = await getUser(database, context.get("auth0Id"));
  if (!user) {
    return context.json(
      {
        success: false,
        error: { code: "USER_NOT_FOUND", message: "User profile has not been provisioned." },
      },
      404
    );
  }

  const id = context.req.param("id");
  try {
    await deleteTransaction(database, user.id, id);
    return context.json({
      success: true,
      message: "Transaction deleted successfully.",
    });
  } catch (error) {
    if (error instanceof ServiceError) {
      return context.json(
        { success: false, error: { code: error.code, message: error.message } },
        error.statusCode as any
      );
    }
    console.error("Failed to delete transaction:", error);
    return context.json(
      {
        success: false,
        error: { code: "INTERNAL_SERVER_ERROR", message: "An unexpected server error occurred." },
      },
      500
    );
  }
});

export default transactionsRouter;
