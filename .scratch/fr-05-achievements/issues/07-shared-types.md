# 07: Shared TypeScript Types & Zod Schemas for Achievements

**What to build:** Type-safe contract between frontend and backend for achievement data, reusable across web and api workspaces.

**Blocked by:** 02 (needs achievement definitions structure)

**Status:** completed

- [x] Add `AchievementDefinition` interface to `packages/shared/src/index.ts` with fields: `id`, `name`, `description`, `icon`, `tier`
- [x] Add `AchievementItem` interface extending `AchievementDefinition` with `unlockedAt: string | null`
- [x] Add `achievementResponseSchema` Zod schema for `GET /achievements` response validation
- [x] Add `AchievementUnlockNotification` interface for the `achievementsUnlocked` array in mutating endpoint responses (includes all `AchievementDefinition` fields plus `unlockedAt`)
- [x] Export all new types and schemas from `packages/shared/src/index.ts`
- [x] Backend service layer uses these types (import from `@pocketflow/shared`)
