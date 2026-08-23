# 07: Shared TypeScript Types & Zod Schemas for Achievements

**What to build:** Type-safe contract between frontend and backend for achievement data, reusable across web and api workspaces.

**Blocked by:** 02 (needs achievement definitions structure)

**Status:** ready-for-agent

- [ ] Add `AchievementDefinition` interface to `packages/shared/src/index.ts` with fields: `id`, `name`, `description`, `icon`, `tier`
- [ ] Add `AchievementItem` interface extending `AchievementDefinition` with `unlockedAt: string | null`
- [ ] Add `achievementResponseSchema` Zod schema for `GET /achievements` response validation
- [ ] Add `AchievementUnlockNotification` interface for the `achievementsUnlocked` array in mutating endpoint responses (includes all `AchievementDefinition` fields plus `unlockedAt`)
- [ ] Export all new types and schemas from `packages/shared/src/index.ts`
- [ ] Backend service layer uses these types (import from `@pocketflow/shared`)
