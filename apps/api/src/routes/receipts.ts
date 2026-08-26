import { Hono } from "hono";
import type { Context } from "hono";
import { eq } from "drizzle-orm";
import type { AuthVariables } from "../middleware/auth";
import { createDb } from "../db/client";
import { users } from "../db/schema";
import {
  deleteReceiptAndClearReferences,
  serveReceipt,
  uploadReceipt,
} from "../services/receipt.service";
import { ServiceError } from "../services/transaction.service";

type Bindings = {
  DB?: D1Database;
  RECEIPTS_BUCKET?: R2Bucket;
};

type RouterEnv = { Bindings: Bindings; Variables: AuthVariables };

const receiptsRouter = new Hono<RouterEnv>();

function storageUnavailable(context: Context<RouterEnv>) {
  return context.json({
    success: false,
    error: { code: "STORAGE_UNAVAILABLE", message: "Receipt storage is not configured." },
  }, 503);
}

function toErrorResponse(error: unknown) {
  if (error instanceof ServiceError) {
    return {
      status: error.statusCode as 400 | 403 | 404 | 413,
      body: { success: false, error: { code: error.code, message: error.message } },
    };
  }
  throw error;
}

receiptsRouter.post("/", async (context) => {
  const bucket = context.env.RECEIPTS_BUCKET;
  if (!bucket) return storageUnavailable(context);

  const form = await context.req.formData().catch(() => null);
  const file = form?.get("receipt");
  if (!(file instanceof File)) {
    return context.json({
      success: false,
      error: { code: "NO_FILE", message: 'Provide a receipt image in the "receipt" field of a multipart form.' },
    }, 400);
  }

  try {
    const uploaded = await uploadReceipt(bucket, context.get("userId"), file);
    return context.json({
      success: true,
      data: { key: uploaded.key, receiptUrl: `/api/receipts/${uploaded.key}` },
    }, 201);
  } catch (error) {
    const handled = toErrorResponse(error);
    return context.json(handled.body, handled.status);
  }
});

receiptsRouter.get("/:key{.*}", async (context) => {
  const bucket = context.env.RECEIPTS_BUCKET;
  if (!bucket) return storageUnavailable(context);

  try {
    const receipt = await serveReceipt(bucket, context.get("userId"), context.req.param("key") ?? "");
    return new Response(receipt.body, {
      headers: {
        "Content-Type": receipt.contentType,
        "Cache-Control": "private",
      },
    });
  } catch (error) {
    const handled = toErrorResponse(error);
    return context.json(handled.body, handled.status);
  }
});

receiptsRouter.delete("/:key{.*}", async (context) => {
  const bucket = context.env.RECEIPTS_BUCKET;
  if (!bucket) return storageUnavailable(context);

  const database = context.env.DB ? createDb(context.env.DB) : undefined;
  if (!database) {
    return context.json({
      success: false,
      error: { code: "DATABASE_UNAVAILABLE", message: "D1 Database is not configured." },
    }, 503);
  }

  const user = await database
    .select()
    .from(users)
    .where(eq(users.auth0Id, context.get("auth0Id")))
    .limit(1)
    .then((rows) => rows[0]);
  if (!user) {
    return context.json({
      success: false,
      error: { code: "USER_NOT_FOUND", message: "User profile has not been provisioned." },
    }, 404);
  }

  try {
    await deleteReceiptAndClearReferences(bucket, database, user.id, context.req.param("key") ?? "");
    return context.json({ success: true, data: { deleted: true } });
  } catch (error) {
    const handled = toErrorResponse(error);
    return context.json(handled.body, handled.status);
  }
});

export default receiptsRouter;
