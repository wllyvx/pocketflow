import { ServiceError } from "./transaction.service";

export const MAX_RECEIPT_SIZE_BYTES = 5 * 1024 * 1024;

const ALLOWED_CONTENT_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
} as const;

export type ReceiptContentType = keyof typeof ALLOWED_CONTENT_TYPES;

function sniffContentType(bytes: Uint8Array): ReceiptContentType | null {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }
  return null;
}

export function receiptKeyFor(userId: string, extension: string) {
  return `${userId}/${crypto.randomUUID()}.${extension}`;
}

export type UploadedReceipt = {
  key: string;
  contentType: ReceiptContentType;
  size: number;
};

export async function uploadReceipt(
  bucket: R2Bucket,
  userId: string,
  file: File
): Promise<UploadedReceipt> {
  const contentType = (file.type || "").toLowerCase() as ReceiptContentType;
  if (!(contentType in ALLOWED_CONTENT_TYPES)) {
    throw new ServiceError(
      "UNSUPPORTED_FILE_TYPE",
      "Only JPEG and PNG receipt images are supported.",
      400
    );
  }

  if (file.size > MAX_RECEIPT_SIZE_BYTES) {
    throw new ServiceError(
      "FILE_TOO_LARGE",
      "Receipt images must be 5MB or smaller.",
      413
    );
  }

  const content = new Uint8Array(await file.arrayBuffer());
  const sniffed = sniffContentType(content);
  if (sniffed !== contentType) {
    throw new ServiceError(
      "INVALID_FILE_CONTENT",
      "The uploaded file's content does not match a valid JPEG or PNG image.",
      400
    );
  }

  const key = receiptKeyFor(userId, ALLOWED_CONTENT_TYPES[contentType]);
  await bucket.put(key, content, {
    httpMetadata: { contentType },
  });

  return { key, contentType, size: content.byteLength };
}

export type ServedReceipt = {
  body: ReadableStream;
  contentType: string;
};

export async function serveReceipt(
  bucket: R2Bucket,
  userId: string,
  key: string
): Promise<ServedReceipt> {
  // Ownership boundary. Safe only because R2 keys are literal and keys are
  // server-generated — see docs/adr/0001-receipt-key-isolation-literal-keys.md
  if (!key.startsWith(`${userId}/`)) {
    throw new ServiceError(
      "RECEIPT_FORBIDDEN",
      "You do not have access to this receipt.",
      403
    );
  }

  const object = await bucket.get(key);
  if (!object) {
    throw new ServiceError(
      "RECEIPT_NOT_FOUND",
      "The requested receipt does not exist.",
      404
    );
  }

  return {
    body: object.body,
    contentType:
      object.httpMetadata?.contentType ?? "application/octet-stream",
  };
}

export function receiptKeyFromUrl(url: string): string | null {
  const prefix = "/api/receipts/";
  if (!url.startsWith(prefix)) return null;
  const key = url.slice(prefix.length);
  return key === "" ? null : key;
}

/**
 * Deletes the previously stored receipt object when an update replaces or
 * clears the receipt reference. A no-op when the update omits the field
 * (`undefined`) or keeps the same reference.
 */
export async function cleanupReplacedReceipt(
  bucket: R2Bucket,
  userId: string,
  previousReceiptUrl: string | null,
  inputReceiptUrl: string | null | undefined
): Promise<void> {
  if (inputReceiptUrl === undefined) return;

  const nextUrl =
    inputReceiptUrl && inputReceiptUrl.trim() !== "" ? inputReceiptUrl.trim() : null;
  if (!previousReceiptUrl || previousReceiptUrl === nextUrl) return;

  const key = receiptKeyFromUrl(previousReceiptUrl);
  if (!key) return;

  await deleteReceipt(bucket, userId, key);
}

export async function deleteReceipt(
  bucket: R2Bucket,
  userId: string,
  key: string
): Promise<void> {
  // Ownership boundary. Safe only because R2 keys are literal and keys are
  // server-generated — see docs/adr/0001-receipt-key-isolation-literal-keys.md
  if (!key.startsWith(`${userId}/`)) {
    throw new ServiceError(
      "RECEIPT_FORBIDDEN",
      "You do not have access to this receipt.",
      403
    );
  }

  await bucket.delete(key);
}
