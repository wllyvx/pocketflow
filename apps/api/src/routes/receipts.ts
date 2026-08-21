// Receipt upload stub endpoint – returns a mock URL for the uploaded file
import { Hono } from "hono";
import type { Bindings } from "../index"; // reuse Bindings definition

const router = new Hono<{ Bindings: Bindings }>();

router.post("/", async (c) => {
  const contentType = c.req.header("Content-Type") ?? "";
  if (!contentType.startsWith("multipart/form-data")) {
    return c.json({ success: false, error: { code: "INVALID_CONTENT_TYPE", message: "Expected multipart/form-data" } }, 400);
  }
  const form = await c.req.formData();
  const file = form.get("receipt") as File | null;
  if (!file) {
    return c.json({ success: false, error: { code: "NO_FILE", message: "No file provided" } }, 400);
  }
  // In MVP we just generate a placeholder URL – in a real implementation this would upload to R2
  const mockUrl = `https://example.com/${file.name}`;
  // Optionally, you could store the file in R2 if the bucket is configured:
  // if (c.env.RECEIPTS_BUCKET) { await c.env.RECEIPTS_BUCKET.put(file.name, file.stream()); }
  return c.json({ success: true, data: { receiptUrl: mockUrl } });
});

export default router;
