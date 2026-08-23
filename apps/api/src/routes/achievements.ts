import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { createDb } from "../db/client";
import { users } from "../db/schema";
import type { AuthVariables } from "../middleware/auth";
import { getUserAchievements } from "../services/achievements/achievement.service";
import { ServiceError } from "../services/transaction.service";

type Bindings = {
  DB?: D1Database;
  DEV_AUTH_TOKEN: string;
  FRONTEND_ORIGIN?: string;
  RECEIPTS_BUCKET?: R2Bucket;
};

const achievementsRouter = new Hono<{ Bindings: Bindings; Variables: AuthVariables }>();

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
  console.error("Achievements request failed:", error);
  return context.json({ success: false, error: { code: "INTERNAL_SERVER_ERROR", message: "An unexpected server error occurred." } }, 500);
}

achievementsRouter.get("/", async (context) => {
  const resolved = await getDatabaseAndUser(context);
  if ("error" in resolved) return resolved.error;
  try {
    const achievements = await getUserAchievements(resolved.database, resolved.user.id);
    return context.json({ success: true, data: achievements });
  } catch (error) {
    return serviceErrorResponse(context, error);
  }
});

export default achievementsRouter;
