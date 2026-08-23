---
title: FR-05 Achievements & Gamification System
labels: [ready-for-agent]
status: open
---

## Problem Statement

Users need motivation and positive reinforcement to maintain consistent budgeting habits. Without a gamification layer, the application feels purely utilitarian and may fail to encourage daily engagement and long-term financial discipline.

## Solution

Implement an achievements system that automatically recognizes and rewards users for key financial milestones and habits. The system will track 7 distinct achievements across three tiers, unlock them based on user behavior, notify users in-app when achievements are earned, and provide a dedicated page to view all achievements.

## User Stories

1. As a new user, I want to earn an achievement when I create my first envelope, so that I feel encouraged to continue setting up my budget.
2. As a new user, I want to earn an achievement when I log my first transaction, so that I understand the core action the app wants me to take regularly.
3. As a user, I want to earn an achievement when all my envelopes are funded, so that I feel accomplished for completing my budget setup.
4. As a user, I want to earn an achievement after logging transactions for 7 consecutive days, so that I feel rewarded for building a consistent habit.
5. As a user, I want to earn an achievement after logging 10 total transactions, so that I see my progress toward becoming a regular user.
6. As a user, I want to earn an achievement after completing a full monthly budget cycle without any envelope going into overspending, so that I feel proud of my budget discipline.
7. As a user, I want to earn an achievement after logging transactions for 30 consecutive days, so that I feel I've mastered the habit of daily financial tracking.
8. As a user, I want to see a notification when I unlock an achievement, so that I get instant gratification for my positive behavior.
9. As a user, I want to visit a "My Achievements" page where I can see all available achievements and their unlock status.
10. As a user, I want locked achievements to be visually distinct from unlocked ones, so that I can see what I haven't earned yet.
11. As a user, I want achievements I've already earned to remain permanently unlocked, even if I later change or delete data.
12. As a user, I want the system to track my logging streak automatically, so that I don't have to manually calculate consecutive days.
13. As a user, I want my streak to reset to 1 if I skip a day, so that the achievement feels genuinely challenging and earned.
14. As a developer, I want achievement criteria to be defined in a single config file, so that I can easily modify achievements during MVP without database migrations.
15. As a developer, I want user achievement unlocks to be stored with a unique constraint on userId + achievementId, so that race conditions can't cause duplicates.
16. As a developer, I want the achievement engine to be called from route handlers after successful operations, so that unlocks happen synchronously and are included in the API response.
17. As a developer, I want achievement checks to short-circuit if the user already has the achievement, so that repeated checks are fast.
18. As a developer, I want GET /achievements to return all achievements with unlock status for the authenticated user.
19. As a developer, I want the "Budget Cycle Complete" achievement to use lazy evaluation (triggered on first transaction of new month), so that I don't need cron jobs in MVP.
20. As a developer, I want to follow the existing service layer pattern (envelope.service.ts, transaction.service.ts), so that achievement logic lives in achievement.service.ts and is testable in isolation.

## Implementation Decisions

### Schema Changes

**User Table Additions:**
- Add `currentStreak` column (integer, default 0) to track consecutive days of transaction logging
- Add `lastActivityDate` column (integer timestamp, nullable) to track the last date a transaction was logged
- These columns enable incremental streak tracking without querying full transaction history

**New UserAchievement Table:**
- `id` (text, primary key)
- `userId` (text, foreign key to users.id)
- `achievementId` (text, matches hardcoded achievement definition IDs)
- `unlockedAt` (integer timestamp)
- `createdAt` (integer timestamp)
- `updatedAt` (integer timestamp)
- Composite unique constraint on `[userId, achievementId]` to prevent duplicate unlocks at database level

### Achievement Definitions

Achievements are defined as a hardcoded config array in `apps/api/src/services/achievements/definitions.ts`:

**Tier 1 — First Steps:**
1. `first-envelope` — "First Envelope Created" (icon: `folder-plus`)
2. `first-transaction` — "First Transaction Logged" (icon: `receipt`)
3. `all-envelopes-funded` — "All Envelopes Funded" (icon: `wallet`)

**Tier 2 — Consistency & Habits:**
4. `7-day-streak` — "7-Day Logging Streak" (icon: `flame`)
5. `10-transactions` — "10 Transactions Logged" (icon: `list-ordered`)
6. `budget-cycle-complete` — "Budget Cycle Complete (No Overspending)" (icon: `shield-check`)

**Tier 3 — Mastery:**
7. `30-day-streak` — "30-Day Logging Streak" (icon: `trophy`)

Each definition includes:
- `id` (string, unique identifier)
- `name` (string, display name)
- `description` (string, explains what was accomplished)
- `icon` (string, icon identifier for frontend icon library mapping)
- `tier` (number, 1-3 for grouping/sorting)

### Modules to Build

**New: `apps/api/src/services/achievements/`**
- `definitions.ts` — Hardcoded array of achievement definitions
- `achievement.service.ts` — Core logic:
  - `checkAndUnlock(database, userId, achievementId)` — Idempotent unlock with DB constraint
  - `checkAchievementsForEvent(database, userId, eventType)` — Evaluates all achievements relevant to an event type
  - `getUserAchievements(database, userId)` — Fetches all achievements with unlock status for a user
  - Incremental streak update logic (on transaction create)
  - Budget cycle evaluation logic (monthly calendar-based, lazy evaluation)

**New Route: `apps/api/src/routes/achievements.ts`**
- `GET /achievements` — Returns flat array of all achievement definitions merged with user's unlock status

**Modified: `apps/api/src/routes/transactions.ts`**
- After successful `POST /transactions`, call `checkAchievementsForEvent(database, userId, 'transaction_created')`
- Update User table streak columns (`currentStreak`, `lastActivityDate`) before achievement checks
- Include `achievementsUnlocked: []` array in response payload

**Modified: `apps/api/src/routes/envelopes.ts`**
- After successful `POST /envelopes`, call `checkAchievementsForEvent(database, userId, 'envelope_created')`
- After successful `POST /envelopes/:id/fill` or operations that fund envelopes, call `checkAchievementsForEvent(database, userId, 'envelope_funded')`
- Include `achievementsUnlocked: []` array in response payload

**Modified: `apps/api/src/db/schema.ts`**
- Add `currentStreak` and `lastActivityDate` to `users` table
- Add new `userAchievements` table definition

### API Contracts

**Response Format for Mutating Endpoints:**
All endpoints that trigger achievement checks (POST/PUT transactions, POST/PUT envelopes) will include an optional `achievementsUnlocked` array in the success response:

```typescript
{
  success: true,
  data: { /* transaction or envelope object */ },
  achievementsUnlocked: [
    {
      id: "first-transaction",
      name: "First Transaction Logged",
      description: "You logged your first transaction!",
      icon: "receipt",
      tier: 1,
      unlockedAt: "2026-08-23T04:51:50.344Z"
    }
  ]
}
```

If no achievements unlock, the array will be empty `[]`.

**New Endpoint: GET /achievements**
```typescript
GET /achievements
Authorization: Bearer <JWT>

Response 200:
{
  success: true,
  data: [
    {
      id: "first-envelope",
      name: "First Envelope Created",
      description: "You created your first budget envelope!",
      icon: "folder-plus",
      tier: 1,
      unlockedAt: "2026-08-20T10:00:00Z" // or null if locked
    },
    {
      id: "7-day-streak",
      name: "7-Day Logging Streak",
      description: "You logged transactions for 7 consecutive days!",
      icon: "flame",
      tier: 2,
      unlockedAt: null // locked
    },
    // ... 5 more
  ]
}
```

### Specific Interactions

**Streak Calculation (Incremental):**
On every `POST /transactions`:
1. Read user's `currentStreak` and `lastActivityDate` from User table
2. Get today's date (UTC, date-only comparison)
3. If `lastActivityDate` is null (first ever transaction): set `currentStreak = 1`, `lastActivityDate = today`
4. If `lastActivityDate === today`: no change (same day, don't increment)
5. If `lastActivityDate === today - 1 day`: increment `currentStreak`, update `lastActivityDate = today`
6. Otherwise (gap > 1 day): reset `currentStreak = 1`, update `lastActivityDate = today`
7. Update User table with new values
8. After update, check `7-day-streak` (currentStreak >= 7) and `30-day-streak` (currentStreak >= 30)

**Budget Cycle Complete Evaluation (Lazy, Monthly Calendar-Based):**
On `POST /transactions`:
1. Compare transaction date month with user's `lastActivityDate` month
2. If different month (user is logging transaction in a new month):
   - Query all envelopes for user
   - Query all transactions for user in the **previous month**
   - For each envelope, check if any transaction caused `currentAmount < 0` during previous month
   - If at least 1 envelope exists AND no envelope went negative in previous month: unlock `budget-cycle-complete`

**All Envelopes Funded Check:**
Triggered on `POST /envelopes`, `POST /envelopes/:id/fill`, or operations that fund envelopes:
1. Query all envelopes for user
2. Check if all have `currentAmount > 0`
3. If true (and count >= 1): unlock `all-envelopes-funded`

**Transaction Count Check:**
On `POST /transactions`:
1. Count total transactions for user
2. If count >= 10: unlock `10-transactions`

**Achievement Check Idempotency:**
Every `checkAndUnlock` call:
1. Query `UserAchievement` table for existing record with `userId + achievementId`
2. If found: return null immediately (already unlocked)
3. If not found: evaluate criteria function
4. If criteria passes: INSERT into `UserAchievement` (DB unique constraint prevents race condition duplicates)
5. Return the new `UserAchievement` record to be included in API response

### Testing Seams

The primary testing seam is the **service layer** (`achievement.service.ts`), following the existing pattern in `apps/api/src/services/envelope.service.test.ts`.

Tests will:
- Mock the Drizzle database object (same pattern as `createReadDatabase` in envelope tests)
- Test `checkAndUnlock` idempotency (returns null if already unlocked)
- Test each achievement's criteria function in isolation
- Test streak increment/reset logic
- Test budget cycle evaluation logic
- Test that `checkAchievementsForEvent` only evaluates relevant achievements for a given event type

Route-level integration is not tested in MVP (following existing pattern where only service layer has test coverage).

## Testing Decisions

**What Makes a Good Test:**
- Test external behavior of service functions, not internal implementation details
- Mock database at the Drizzle query builder interface level (return shape of expected queries)
- Test edge cases: already unlocked achievement, streak reset on gap, budget cycle with zero envelopes, etc.
- No need to test route handlers directly (trust Hono routing, test service layer only)

**Modules to Test:**
- `achievement.service.ts` (all exported functions)
- Each achievement's criteria evaluation logic

**Prior Art:**
- Follow the pattern in `apps/api/src/services/envelope.service.test.ts`
- Use Vitest (`describe`, `it`, `expect`)
- Mock database with typed query builder pattern
- Test contracts defined in `@pocketflow/shared` schemas where applicable

**Example Test Structure:**
```typescript
describe("Achievement service", () => {
  it("returns null if achievement already unlocked", async () => {
    const db = createMockDb({ existingAchievement: true });
    const result = await checkAndUnlock(db, "user-1", "first-transaction");
    expect(result).toBeNull();
  });

  it("unlocks first-transaction achievement on first transaction", async () => {
    const db = createMockDb({ transactionCount: 1, existingAchievement: false });
    const result = await checkAndUnlock(db, "user-1", "first-transaction");
    expect(result).toMatchObject({ userId: "user-1", achievementId: "first-transaction" });
  });

  it("increments streak when transaction logged next day", () => {
    const result = calculateNewStreak(3, new Date("2026-08-22"), new Date("2026-08-23"));
    expect(result.currentStreak).toBe(4);
  });

  it("resets streak to 1 when gap > 1 day", () => {
    const result = calculateNewStreak(5, new Date("2026-08-20"), new Date("2026-08-23"));
    expect(result.currentStreak).toBe(1);
  });
});
```

## Out of Scope

- Achievement progress tracking (e.g., "3/7 days" for locked achievements) — can be added in Phase 2 if user feedback requests it
- Persistent notification list (toast is transient only) — no "notification center" in MVP
- Email notifications for achievement unlocks — in-app only
- Admin dashboard to add/edit achievements dynamically — hardcoded definitions are sufficient for MVP
- Achievements for receipt uploads, envelope transfers, or other secondary actions — focusing on core behaviors only
- Leaderboards, sharing achievements, or social features — out of scope per PRD.md
- Scheduled cron job for "Budget Cycle Complete" — using lazy evaluation instead for MVP simplicity
- More granular achievements (e.g., "14-Day Streak", "5 Envelopes Funded") — 7 achievements are sufficient for MVP

## Further Notes

**Icon Library Dependency:**
Frontend must map icon identifier strings (e.g., "flame", "trophy", "folder-plus") to actual icon components from a library like Lucide or Heroicons. The backend only stores/returns the string identifier. Frontend team should confirm icon library choice before implementation begins.

**Future Extensibility:**
The hardcoded definitions approach allows rapid iteration in MVP. If achievement count grows beyond 15-20, or if there's a need for per-user custom achievements, migrate definitions to a database table (`Achievement` master table). The `UserAchievement` table structure already supports this migration path (foreign key to `Achievement.id` instead of hardcoded string).

**Performance Consideration:**
Achievement checks add minimal overhead (1-2 extra DB queries per mutating request). If performance becomes an issue at scale, consider:
- Batch achievement checks in a background job (trade immediacy for throughput)
- Cache user achievement status in-memory or in a fast KV store
- Add database indexes on `UserAchievement.userId` and `UserAchievement.achievementId`

**Streak Edge Case:**
Streak is calculated in UTC. Users in different timezones may experience streak reset at unexpected local times (e.g., 7pm PST = midnight UTC next day). This is acceptable for MVP; if user feedback indicates timezone issues, consider storing user timezone preference and calculating streaks in local time.
