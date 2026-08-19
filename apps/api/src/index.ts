import { Hono } from "hono";
import { requireAuth } from "./middleware/auth";

type Bindings = {
  DB?: D1Database;
  DEV_AUTH_TOKEN: string;
  RECEIPTS_BUCKET?: R2Bucket;
};

type Variables = {
  userId: string;
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.get("/health", (context) => context.json({ success: true, data: { service: "api", status: "ok" } }));

app.use("/api/*", requireAuth);
app.get("/api/hello", (context) => context.json({
  success: true,
  data: { message: "PocketFlow API is ready.", userId: context.get("userId") },
}));

export default app;
