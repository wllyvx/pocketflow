/// <reference types="vitest" />
import { describe, expect, it } from "vitest";
import { Hono } from "hono";
import { createFakeBucket } from "../test/fakes";
import receiptsRouter from "../routes/receipts";
import type { AuthVariables } from "../middleware/auth";

type Bindings = { RECEIPTS_BUCKET?: R2Bucket };

const JPEG_MAGIC = [0xff, 0xd8, 0xff, 0xe0];

function bytes(magic: number[]): Uint8Array {
  return new Uint8Array(magic);
}

function createApp(bucket: R2Bucket) {
  const app = new Hono<{ Bindings: Bindings; Variables: AuthVariables }>();
  app.use("*", async (context, next) => {
    context.set("userId", "user-1");
    context.set("auth0Id", "user-1");
    await next();
  });
  app.route("/api/receipts", receiptsRouter);
  return app;
}

describe("FR-07 receipts routes (wiring)", () => {
  it("upload returns a proxy URL and the file is retrievable by its owner with private cache headers", async () => {
    const bucket = createFakeBucket();
    const app = createApp(bucket);

    const form = new FormData();
    form.append("receipt", new File([bytes(JPEG_MAGIC) as BlobPart], "receipt.jpg", { type: "image/jpeg" }));
    const uploadResponse = await app.request("/api/receipts", {
      method: "POST",
      body: form,
    }, { RECEIPTS_BUCKET: bucket });

    expect(uploadResponse.status).toBe(201);
    const uploadBody = (await uploadResponse.json()) as { success: boolean; data: { key: string; receiptUrl: string } };
    expect(uploadBody.success).toBe(true);
    const serveResponse = await app.request(uploadBody.data.receiptUrl, {}, { RECEIPTS_BUCKET: bucket });
    expect(serveResponse.status).toBe(200);
    expect(serveResponse.headers.get("Content-Type")).toBe("image/jpeg");
    expect(serveResponse.headers.get("Cache-Control")).toBe("private");
    const servedBytes = new Uint8Array(await serveResponse.arrayBuffer());
    expect([...servedBytes.slice(0, JPEG_MAGIC.length)]).toEqual(JPEG_MAGIC);
  });

  it("rejects invalid uploads with the service error codes", async () => {
    const bucket = createFakeBucket();
    const app = createApp(bucket);

    const form = new FormData();
    form.append("receipt", new File([new TextEncoder().encode("nope") as BlobPart], "file.txt", { type: "text/plain" }));
    const response = await app.request("/api/receipts", {
      method: "POST",
      body: form,
    }, { RECEIPTS_BUCKET: bucket });

    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe("UNSUPPORTED_FILE_TYPE");
  });
});
