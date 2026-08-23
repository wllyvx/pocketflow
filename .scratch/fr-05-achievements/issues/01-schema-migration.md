# 01: Schema & Database Migration for Achievements

**What to build:** Database tables ready to store user achievements and streak data. Migration can be applied to D1.

**Blocked by:** None (can start immediately)

**Status:** completed

- [x] Add `currentStreak` (integer, default 0) and `lastActivityDate` (integer timestamp, nullable) columns to `users` table in `apps/api/src/db/schema.ts`
- [x] Create new `userAchievements` table with columns: `id` (PK), `userId` (FK), `achievementId` (text), `unlockedAt` (timestamp), `createdAt`, `updatedAt`
- [x] Add composite unique constraint on `[userId, achievementId]`
- [x] Generate Drizzle migration with `drizzle-kit generate`
- [x] Migration applies cleanly to local D1 via `wrangler d1 migrations apply`
