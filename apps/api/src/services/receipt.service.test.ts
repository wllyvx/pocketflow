/// <reference types="vitest" />
import { describe, expect, it } from "vitest";
import {
  MAX_RECEIPT_SIZE_BYTES,
  cleanupReplacedReceipt,
  deleteReceipt,
  deleteReceiptAndClearReferences,
  receiptKeyFor,
  receiptKeyFromUrl,
  serveReceipt,
  uploadReceipt,
} from "./receipt.service";
import { createFakeBucket } from "../test/fakes";

const JPEG_MAGIC = [0xff, 0xd8, 0xff, 0xe0];
const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

function bytes(magic: number[], filler = 0x00, fillLength = 16): Uint8Array {
  const buffer = new Uint8Array(magic.length + fillLength);
  buffer.set(magic, 0);
  buffer.fill(filler, magic.length);
  return buffer;
}

function makeFile(content: Uint8Array, type: string, name = "receipt.jpg"): File {
  return new File([content as BlobPart], name, { type });
}

describe("FR-07 receipt storage contract", () => {
  it("stores a valid JPEG under a user-scoped key with its content type", async () => {
    const bucket = createFakeBucket();
    const result = await uploadReceipt(bucket, "user-1", makeFile(bytes(JPEG_MAGIC), "image/jpeg"));

    expect(result.key).toMatch(/^user-1\/[0-9a-f-]{36}\.jpg$/);
    expect(result.contentType).toBe("image/jpeg");
    const served = await serveReceipt(bucket, "user-1", result.key);
    expect(served.contentType).toBe("image/jpeg");
  });

  it("stores a valid PNG with a .png extension", async () => {
    const bucket = createFakeBucket();
    const result = await uploadReceipt(bucket, "user-1", makeFile(bytes(PNG_MAGIC), "image/png"));

    expect(result.key).toMatch(/^user-1\/[0-9a-f-]{36}\.png$/);
    expect(result.contentType).toBe("image/png");
  });

  it("rejects content types outside the JPEG/PNG allowlist", async () => {
    const bucket = createFakeBucket();
    await expect(uploadReceipt(bucket, "user-1", makeFile(bytes(PNG_MAGIC), "image/gif")))
      .rejects.toMatchObject({ code: "UNSUPPORTED_FILE_TYPE", statusCode: 400 });
  });

  it("rejects files larger than the 5MB limit", async () => {
    const bucket = createFakeBucket();
    const oversized = bytes(JPEG_MAGIC, 0x00, MAX_RECEIPT_SIZE_BYTES);
    await expect(uploadReceipt(bucket, "user-1", makeFile(oversized, "image/jpeg")))
      .rejects.toMatchObject({ code: "FILE_TOO_LARGE", statusCode: 413 });
  });

  it("rejects files whose magic bytes do not match the declared type", async () => {
    const bucket = createFakeBucket();
    await expect(uploadReceipt(bucket, "user-1", makeFile(bytes([0x25, 0x50, 0x44, 0x46]), "image/jpeg")))
      .rejects.toMatchObject({ code: "INVALID_FILE_CONTENT", statusCode: 400 });
    await expect(uploadReceipt(bucket, "user-1", makeFile(new TextEncoder().encode("plain text"), "image/png")))
      .rejects.toMatchObject({ code: "INVALID_FILE_CONTENT", statusCode: 400 });
  });

  it("serves the stored bytes to the owner with the stored content type", async () => {
    const bucket = createFakeBucket();
    const content = bytes(PNG_MAGIC);
    const { key } = await uploadReceipt(bucket, "user-1", makeFile(content, "image/png"));

    const served = await serveReceipt(bucket, "user-1", key);
    const body = await new Response(served.body).arrayBuffer();
    expect(new Uint8Array(body)).toEqual(content);
    expect(served.contentType).toBe("image/png");
  });

  it("denies another user access to someone else's receipt", async () => {
    const bucket = createFakeBucket();
    const { key } = await uploadReceipt(bucket, "user-1", makeFile(bytes(JPEG_MAGIC), "image/jpeg"));

    await expect(serveReceipt(bucket, "user-2", key))
      .rejects.toMatchObject({ code: "RECEIPT_FORBIDDEN", statusCode: 403 });
  });

  it("returns RECEIPT_NOT_FOUND for a missing object owned by the requester", async () => {
    const bucket = createFakeBucket();
    await expect(serveReceipt(bucket, "user-1", receiptKeyFor("user-1", "jpg")))
      .rejects.toMatchObject({ code: "RECEIPT_NOT_FOUND", statusCode: 404 });
  });

  it("deletes a receipt owned by the requesting user", async () => {
    const bucket = createFakeBucket();
    const { key } = await uploadReceipt(bucket, "user-1", makeFile(bytes(JPEG_MAGIC), "image/jpeg"));

    await expect(deleteReceipt(bucket, "user-1", key)).resolves.toBeUndefined();
    await expect(serveReceipt(bucket, "user-1", key))
      .rejects.toMatchObject({ code: "RECEIPT_NOT_FOUND" });
  });

  it("refuses to delete a receipt whose key belongs to another user", async () => {
    const bucket = createFakeBucket();
    const { key } = await uploadReceipt(bucket, "user-1", makeFile(bytes(JPEG_MAGIC), "image/jpeg"));

    await expect(deleteReceipt(bucket, "user-2", key))
      .rejects.toMatchObject({ code: "RECEIPT_FORBIDDEN", statusCode: 403 });
    await expect(serveReceipt(bucket, "user-1", key)).resolves.toBeTruthy();
  });

  it("is idempotent when the object no longer exists", async () => {
    const bucket = createFakeBucket();
    const key = receiptKeyFor("user-1", "jpg");
    await expect(deleteReceipt(bucket, "user-1", key)).resolves.toBeUndefined();
  });

  it("extracts the storage key from a proxied receipt URL", () => {
    expect(receiptKeyFromUrl("/api/receipts/user-1/abc.jpg")).toBe("user-1/abc.jpg");
  });

  it("returns null for URLs outside the receipt proxy", () => {
    expect(receiptKeyFromUrl("https://evil.example.com/user-2/abc.jpg")).toBeNull();
    expect(receiptKeyFromUrl("/api/envelopes/user-1/abc.jpg")).toBeNull();
    expect(receiptKeyFromUrl("/api/receipts/")).toBeNull();
  });

  it("cleanupReplacedReceipt deletes the old object on replace or clear", async () => {
    const bucket = createFakeBucket();
    const { key } = await uploadReceipt(bucket, "user-1", makeFile(bytes(JPEG_MAGIC), "image/jpeg"));
    await uploadReceipt(bucket, "user-1", makeFile(bytes(PNG_MAGIC), "image/png"));

    await cleanupReplacedReceipt(bucket, "user-1", `/api/receipts/${key}`, null);
    await expect(serveReceipt(bucket, "user-1", key))
      .rejects.toMatchObject({ code: "RECEIPT_NOT_FOUND" });
  });

  it("cleanupReplacedReceipt does nothing when the update omits the receipt field", async () => {
    const bucket = createFakeBucket();
    const { key } = await uploadReceipt(bucket, "user-1", makeFile(bytes(JPEG_MAGIC), "image/jpeg"));

    await cleanupReplacedReceipt(bucket, "user-1", `/api/receipts/${key}`, undefined);
    await expect(serveReceipt(bucket, "user-1", key)).resolves.toBeTruthy();
  });

  it("cleanupReplacedReceipt keeps the object when the URL is unchanged", async () => {
    const bucket = createFakeBucket();
    const { key } = await uploadReceipt(bucket, "user-1", makeFile(bytes(JPEG_MAGIC), "image/jpeg"));

    await cleanupReplacedReceipt(bucket, "user-1", `/api/receipts/${key}`, `/api/receipts/${key} `);
    await expect(serveReceipt(bucket, "user-1", key)).resolves.toBeTruthy();
  });

  describe("deleteReceiptAndClearReferences", () => {
    function createFakeDb() {
      const calls: { set: unknown; where: unknown }[] = [];
      return {
        calls,
        update: () => ({
          set: (set: unknown) => ({
            where: (where: unknown) => {
              calls.push({ set, where });
              return Promise.resolve(undefined);
            },
          }),
        }),
      } as any;
    }

    it("deletes the object and clears the receipt reference on matching transactions", async () => {
      const bucket = createFakeBucket();
      const db = createFakeDb();
      const { key } = await uploadReceipt(bucket, "user-1", makeFile(bytes(JPEG_MAGIC), "image/jpeg"));

      await deleteReceiptAndClearReferences(bucket, db, "user-1", key);

      await expect(serveReceipt(bucket, "user-1", key))
        .rejects.toMatchObject({ code: "RECEIPT_NOT_FOUND" });
      expect(db.calls).toHaveLength(1);
      expect(db.calls[0].set).toEqual({ receiptUrl: null });
      expect(db.calls[0].where).toBeTruthy();
    });

    it("refuses to delete a receipt owned by another user and touches no transactions", async () => {
      const bucket = createFakeBucket();
      const db = createFakeDb();
      const { key } = await uploadReceipt(bucket, "user-1", makeFile(bytes(JPEG_MAGIC), "image/jpeg"));

      await expect(deleteReceiptAndClearReferences(bucket, db, "user-2", key))
        .rejects.toMatchObject({ code: "RECEIPT_FORBIDDEN", statusCode: 403 });
      await expect(serveReceipt(bucket, "user-1", key)).resolves.toBeTruthy();
      expect(db.calls).toHaveLength(0);
    });
  });
});
