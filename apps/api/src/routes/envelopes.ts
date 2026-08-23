import { Hono } from "hono";
import { eq } from "drizzle-orm";
import {
  createEnvelopeSchema,
  deleteEnvelopeSchema,
  fillEnvelopeSchema,
  transferEnvelopeSchema,
  updateEnvelopeSchema,
} from "@pocketflow/shared";
import { createDb } from "../db/client";
import { users } from "../db/schema";
import type { AuthVariables } from "../middleware/auth";
import {
  createEnvelope,
  deleteEnvelope,
  fillEnvelope,
  getEnvelopeDeletePreview,
  getEnvelopeById,
  listEnvelopes,
  transferEnvelopeFunds,
  updateEnvelope,
} from "../services/envelope.service";
import { ServiceError } from "../services/transaction.service";
import { checkAchievementsForEvent, getUserAchievements } from "../services/achievements/achievement.service";

type Bindings = {
  DB?: D1Database;
  DEV_AUTH_TOKEN: string;
  FRONTEND_ORIGIN?: string;
  RECEIPTS_BUCKET?: R2Bucket;
};

const envelopesRouter = new Hono<{ Bindings: Bindings; Variables: AuthVariables }>();

async function getUser(database: ReturnType<typeof createDb>, auth0Id: string) {
  return database.select().from(users).where(eq(users.auth0Id, auth0Id)).limit(1).then((rows) => rows[0]);
}

async function getDatabaseAndUser(context: any) {
  const database = context.env.DB ? createDb(context.env.DB) : undefined;
  if (!database) return { error: context.json({ success: false, error: { code: "DATABASE_UNAVAILABLE", message: "D1 Database is not configured." } }, 503) } as const;
  const user = await getUser(database, context.get("auth0Id"));
  if (!user) return { error: context.json({ success: false, error: { code: "USER_NOT_FOUND", message: "User profile has not been provisioned." } }, 404) } as const;
  return { database, user } as const;
}

function serviceErrorResponse(context: any, error: unknown) {
  if (error instanceof ServiceError) {
    return context.json({ success: false, error: { code: error.code, message: error.message } }, error.statusCode as any);
  }
  console.error("Envelope request failed:", error);
  return context.json({ success: false, error: { code: "INTERNAL_SERVER_ERROR", message: "An unexpected server error occurred." } }, 500);
}

envelopesRouter.get("/", async (context) => {
  const resolved = await getDatabaseAndUser(context);
  if ("error" in resolved) return resolved.error;
  try {
    return context.json({ success: true, data: await listEnvelopes(resolved.database, resolved.user.id) });
  } catch (error) {
    return serviceErrorResponse(context, error);
  }
});

envelopesRouter.get("/:id/delete-preview", async (context) => {
  const resolved = await getDatabaseAndUser(context);
  if ("error" in resolved) return resolved.error;
  try {
    const preview = await getEnvelopeDeletePreview(resolved.database, resolved.user.id, context.req.param("id"));
    if (!preview) return context.json({ success: false, error: { code: "NOT_FOUND", message: "Envelope not found." } }, 404);
    return context.json({ success: true, data: preview });
  } catch (error) {
    return serviceErrorResponse(context, error);
  }
});

envelopesRouter.get("/:id", async (context) => {
  const resolved = await getDatabaseAndUser(context);
  if ("error" in resolved) return resolved.error;
  try {
    const envelope = await getEnvelopeById(resolved.database, resolved.user.id, context.req.param("id"));
    if (!envelope) return context.json({ success: false, error: { code: "NOT_FOUND", message: "Envelope not found." } }, 404);
    return context.json({ success: true, data: envelope });
  } catch (error) {
    return serviceErrorResponse(context, error);
  }
});

envelopesRouter.post("/", async (context) => {
  const resolved = await getDatabaseAndUser(context);
  if ("error" in resolved) return resolved.error;
  const parsed = createEnvelopeSchema.safeParse(await context.req.json().catch(() => null));
  if (!parsed.success) return context.json({ success: false, error: { code: "INVALID_INPUT", message: parsed.error.issues[0]?.message ?? "Invalid envelope input." } }, 400);
  try {
    const envelope = await createEnvelope(resolved.database, resolved.user.id, parsed.data);
    
    const achievementsBefore = await getUserAchievements(resolved.database, resolved.user.id);
    const unlockedBeforeIds = new Set(achievementsBefore.filter((a: any) => a.unlocked).map((a: any) => a.id));

    await checkAchievementsForEvent(resolved.database, resolved.user.id, "envelope_created");

    const achievementsAfter = await getUserAchievements(resolved.database, resolved.user.id);
    const newlyUnlocked = achievementsAfter.filter((a: any) => a.unlocked && !unlockedBeforeIds.has(a.id));

    return context.json({
      success: true,
      data: {
        ...envelope,
        achievementsUnlocked: newlyUnlocked,
      },
    }, 201);
  } catch (error) {
    return serviceErrorResponse(context, error);
  }
});

envelopesRouter.put("/:id", async (context) => {
  const resolved = await getDatabaseAndUser(context);
  if ("error" in resolved) return resolved.error;
  const parsed = updateEnvelopeSchema.safeParse(await context.req.json().catch(() => null));
  if (!parsed.success) return context.json({ success: false, error: { code: "INVALID_INPUT", message: parsed.error.issues[0]?.message ?? "Invalid envelope input." } }, 400);
  try {
    return context.json({ success: true, data: await updateEnvelope(resolved.database, resolved.user.id, context.req.param("id"), parsed.data) });
  } catch (error) {
    return serviceErrorResponse(context, error);
  }
});

envelopesRouter.delete("/:id", async (context) => {
  const resolved = await getDatabaseAndUser(context);
  if ("error" in resolved) return resolved.error;
  const body = await context.req.json().catch(() => ({}));
  const parsed = deleteEnvelopeSchema.safeParse(body);
  if (!parsed.success) return context.json({ success: false, error: { code: "INVALID_INPUT", message: parsed.error.issues[0]?.message ?? "Invalid delete input." } }, 400);
  try {
    await deleteEnvelope(resolved.database, resolved.user.id, context.req.param("id"), parsed.data);
    return context.json({ success: true, message: "Envelope and associated transactions deleted successfully." });
  } catch (error) {
    return serviceErrorResponse(context, error);
  }
});

envelopesRouter.post("/:id/fill", async (context) => {
  const resolved = await getDatabaseAndUser(context);
  if ("error" in resolved) return resolved.error;
  const parsed = fillEnvelopeSchema.safeParse(await context.req.json().catch(() => null));
  if (!parsed.success) return context.json({ success: false, error: { code: "INVALID_INPUT", message: parsed.error.issues[0]?.message ?? "Invalid fill input." } }, 400);
  try {
    const envelope = await fillEnvelope(resolved.database, resolved.user.id, context.req.param("id"), parsed.data);

    const achievementsBefore = await getUserAchievements(resolved.database, resolved.user.id);
    const unlockedBeforeIds = new Set(achievementsBefore.filter((a: any) => a.unlocked).map((a: any) => a.id));

    await checkAchievementsForEvent(resolved.database, resolved.user.id, "envelope_funded");

    const achievementsAfter = await getUserAchievements(resolved.database, resolved.user.id);
    const newlyUnlocked = achievementsAfter.filter((a: any) => a.unlocked && !unlockedBeforeIds.has(a.id));

    return context.json({
      success: true,
      data: {
        ...envelope,
        achievementsUnlocked: newlyUnlocked,
      },
    });
  } catch (error) {
    return serviceErrorResponse(context, error);
  }
});

envelopesRouter.post("/transfer", async (context) => {
  const resolved = await getDatabaseAndUser(context);
  if ("error" in resolved) return resolved.error;
  const parsed = transferEnvelopeSchema.safeParse(await context.req.json().catch(() => null));
  if (!parsed.success) return context.json({ success: false, error: { code: "INVALID_INPUT", message: parsed.error.issues[0]?.message ?? "Invalid transfer input." } }, 400);
  try {
    await transferEnvelopeFunds(resolved.database, resolved.user.id, parsed.data);
    return context.json({ success: true, message: "Envelope funds transferred successfully." });
  } catch (error) {
    return serviceErrorResponse(context, error);
  }
});

export default envelopesRouter;