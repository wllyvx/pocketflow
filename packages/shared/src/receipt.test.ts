import { describe, expect, it } from "vitest";
import {
  MAX_RECEIPT_SIZE_BYTES,
  receiptFileSchema,
  validateReceiptFile,
} from "./receipt";

describe("receipt file validation (shared)", () => {
  it("accepts a JPEG within the size limit", () => {
    const result = receiptFileSchema.safeParse({ type: "image/jpeg", size: 1024 });
    expect(result.success).toBe(true);
  });

  it("accepts a PNG within the size limit", () => {
    const result = receiptFileSchema.safeParse({ type: "image/png", size: 1 });
    expect(result.success).toBe(true);
  });

  it("rejects unsupported content types", () => {
    const result = receiptFileSchema.safeParse({ type: "image/gif", size: 1024 });
    expect(result.success).toBe(false);
  });

  it("rejects files larger than 5MB", () => {
    const result = receiptFileSchema.safeParse({
      type: "image/jpeg",
      size: MAX_RECEIPT_SIZE_BYTES + 1,
    });
    expect(result.success).toBe(false);
  });

  it("validateReceiptFile returns ok with no message for a valid file", () => {
    expect(validateReceiptFile({ type: "image/png", size: MAX_RECEIPT_SIZE_BYTES })).toEqual({
      ok: true,
    });
  });

  it("validateReceiptFile returns a user-facing message for an invalid type", () => {
    const result = validateReceiptFile({ type: "application/pdf", size: 10 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/JPEG.*PNG|PNG.*JPEG/i);
    }
  });

  it("validateReceiptFile returns a user-facing message for an oversized file", () => {
    const result = validateReceiptFile({
      type: "image/jpeg",
      size: MAX_RECEIPT_SIZE_BYTES + 1,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toMatch(/5MB/);
    }
  });

  it("exposes the same 5MB limit as the API service contract", () => {
    expect(MAX_RECEIPT_SIZE_BYTES).toBe(5 * 1024 * 1024);
  });
});
