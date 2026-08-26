import type { R2Object, R2ObjectBody } from "@cloudflare/workers-types";

export function createFakeBucket() {
  const store = new Map<string, { value: Uint8Array; httpMetadata?: Record<string, string> }>();
  return {
    async put(key: string, value: ArrayBuffer | Uint8Array, options?: { httpMetadata?: Record<string, string> }) {
      store.set(key, { value: new Uint8Array(value as ArrayBuffer), httpMetadata: options?.httpMetadata });
      return {} as R2Object;
    },
    async get(key: string) {
      const entry = store.get(key);
      if (!entry) return null;
      return {
        body: entry.value,
        arrayBuffer: async () =>
          entry.value.buffer.slice(
            entry.value.byteOffset,
            entry.value.byteOffset + entry.value.byteLength
          ),
        httpMetadata: entry.httpMetadata,
      } as unknown as R2ObjectBody;
    },
    async head(key: string) {
      return store.has(key) ? ({} as R2Object) : null;
    },
    async delete(key: string) {
      store.delete(key);
    },
  } as unknown as R2Bucket;
}
