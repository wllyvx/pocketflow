# 0001. Receipt object-key isolation relies on R2 literal key semantics

Date: 2026-08-26
Status: Accepted
Context: FR-07 Receipt Attachment & Storage — issue `01-upload-serve-core`

## Context

Receipts are stored in Cloudflare R2 under per-user keys of the shape:

```
<userId>/<uuid>.<jpg|png>
```

The authenticated proxy endpoint (`GET /api/receipts/:key{.*}`, `apps/api/src/routes/receipts.ts`) enforces ownership in `serveReceipt` (`apps/api/src/services/receipt.service.ts`) with a single check: the requested key must start with `<userId>/`, where `userId` always comes from the auth token via `requireAuth` — never from the client. Keys are generated server-side at upload time; the client never chooses them.

This is safe **because R2 treats object keys as opaque, literal byte strings**: there is no directory traversal, no URL decoding of stored keys, and no path normalization inside the bucket. A key containing `%2F..%2F` or `../` is just a weird flat string; it never "escapes" the user prefix.

## Decision

Ownership enforcement for receipts is a literal string-prefix check against the authenticated `userId`. We deliberately do not add a database table mapping receipts to owners, nor extra key parsing/validation beyond the prefix check. This invariant rests on two properties that must both hold:

1. **R2 keys are literal.** No component may decode, normalize, or reinterpret object keys before or after the prefix check.
2. **Keys are server-generated** as `<userId>/<uuid>.<ext>`. Upload paths must never accept a client-supplied key or prefix.

## Consequences

- Any future change that introduces key normalization (URL-decoding the proxy path before the prefix check, rewriting keys, migrating buckets with transformation) silently breaks user isolation. If such a change is ever proposed, this ADR must be revisited first.
- If receipts ever need richer metadata (deletion cascades on account deletion, retention policy — an open question in REQUIREMENTS.md §6), a D1 mapping table can be added then without weakening today's prefix check.
- The prefix check doubles as the authorization boundary and the tenancy layout. Renaming the key format is a breaking security-relevant change, not a cosmetic one.

## References

- `docs/ARCHITECTURE.md` §8 (data access scoped by token `userId`)
- Implementation: `apps/api/src/services/receipt.service.ts` (`serveReceipt`), `apps/api/src/routes/receipts.ts`
