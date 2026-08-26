import { z } from "zod";

export const MAX_RECEIPT_SIZE_BYTES = 5 * 1024 * 1024;

export const receiptContentTypeSchema = z.enum(["image/jpeg", "image/png"]);
export type ReceiptContentType = z.infer<typeof receiptContentTypeSchema>;

export const receiptFileSchema = z.object({
  type: receiptContentTypeSchema,
  size: z
    .number()
    .int()
    .min(1)
    .max(MAX_RECEIPT_SIZE_BYTES),
});
export type ReceiptFileMeta = z.infer<typeof receiptFileSchema>;

export type ReceiptFileValidationResult =
  | { ok: true }
  | { ok: false; code: "UNSUPPORTED_FILE_TYPE" | "FILE_TOO_LARGE"; message: string };

const MESSAGES: Record<
  "UNSUPPORTED_FILE_TYPE" | "FILE_TOO_LARGE",
  string
> = {
  UNSUPPORTED_FILE_TYPE: "Receipt must be a JPEG or PNG image.",
  FILE_TOO_LARGE: `Receipt images must be ${Math.round(MAX_RECEIPT_SIZE_BYTES / (1024 * 1024))}MB or smaller.`,
};

export function validateReceiptFile(file: {
  type?: string | null;
  size?: number;
}): ReceiptFileValidationResult {
  const parsed = receiptFileSchema.safeParse({
    type: (file.type ?? "").toLowerCase(),
    size: file.size ?? 0,
  });
  if (parsed.success) return { ok: true };

  const firstIssue = parsed.error.issues[0];
  const path = firstIssue?.path?.[0];
  if (path === "type") {
    return { ok: false, code: "UNSUPPORTED_FILE_TYPE", message: MESSAGES.UNSUPPORTED_FILE_TYPE };
  }
  return { ok: false, code: "FILE_TOO_LARGE", message: MESSAGES.FILE_TOO_LARGE };
}
