# 02: Achievement Definitions & Core Service Layer

**What to build:** Hardcoded achievement definitions and the core service functions to check and unlock achievements, testable in isolation.

**Blocked by:** 01 (needs schema types from Drizzle)

**Status:** ready-for-agent

- [ ] Create `apps/api/src/services/achievements/definitions.ts` with 7 achievements (first-envelope, first-transaction, all-envelopes-funded, 7-day-streak, 10-transactions, budget-cycle-complete, 30-day-streak) including id, name, description, icon, tier
- [ ] Create `apps/api/src/services/achievements/achievement.service.ts` with exported functions: `checkAndUnlock(database, userId, achievementId)`, `checkAchievementsForEvent(database, userId, eventType)`, `getUserAchievements(database, userId)`
- [ ] Implement idempotent unlock logic (query existing, short-circuit if found, insert with DB constraint)
- [ ] Implement streak calculation helper (increment on consecutive day, reset on gap > 1 day)
- [ ] Unit tests in `achievement.service.test.ts` covering: idempotency, each achievement's criteria, streak increment/reset, budget cycle evaluation edge cases
- [ ] All tests pass (`pnpm test`)
