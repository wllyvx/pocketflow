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

describe("FR-07 receipt deletion route", () => {
  function createFakeD1() {
    const selects: { sql: string }[] = [];
    const updates: { sql: string; args: unknown[] }[] = [];
    return {
      selects,
      updates,
      prepare(sql: string) {
        const statement = {
          args: [] as unknown[],
          bind(...args: unknown[]) {
            this.args = args;
            return this;
          },
          async all() {
            selects.push({ sql });
            return { results: [{ id: "user-1" }] };
          },
          async run() {
            updates.push({ sql, args: this.args });
            return { success: true };
          },
          async raw() {
            selects.push({ sql });
            return [["user-1"]];
          },
        };
        return statement;
      },
    } as unknown as D1Database & {
      selects: { sql: string }[];
      updates: { sql: string; args: unknown[] }[];
    };
  }

  it("deletes the object and clears transaction references for the owner", async () => {
    const bucket = createFakeBucket();
    const app = createApp(bucket);

    const form = new FormData();
    form.append("receipt", new File([bytes(JPEG_MAGIC) as BlobPart], "receipt.jpg", { type: "image/jpeg" }));
    const upload = await app.request("/api/receipts", { method: "POST", body: form }, { RECEIPTS_BUCKET: bucket });
    const { receiptUrl } = ((await upload.json()) as { data: { key: string; receiptUrl: string } }).data;

    const db = createFakeD1();
    const response = await app.request(receiptUrl, { method: "DELETE" }, {
      RECEIPTS_BUCKET: bucket,
      DB: db,
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as { success: boolean };
    expect(body.success).toBe(true);
    await expect(app.request(receiptUrl, {}, { RECEIPTS_BUCKET: bucket })).resolves.toMatchObject({ status: 404 });
    expect(db.updates).toHaveLength(1);
    expect(db.updates[0].sql).toContain("receipt_url");
  });

  it("returns 403 when deleting a receipt key belonging to another user", async () => {
    const bucket = createFakeBucket();
    const app = createApp(bucket);

    const db = createFakeD1();
    const response = await app.request("/api/receipts/user-2/some.jpg", { method: "DELETE" }, {
      RECEIPTS_BUCKET: bucket,
      DB: db,
    });

    expect(response.status).toBe(403);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe("RECEIPT_FORBIDDEN");
    expect(db.updates).toHaveLength(0);
  });
});
