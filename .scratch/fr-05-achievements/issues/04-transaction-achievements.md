# 04: Transaction Achievement Checks (First Transaction, Streak, 10 Transactions)

**What to build:** Achievements unlock when users log transactions (first-transaction, 7-day-streak, 30-day-streak, 10-transactions). Response includes `achievementsUnlocked` array.

**Blocked by:** 02 (needs service layer)

**Status:** completed

- [x] In `POST /transactions` route handler (after successful transaction create), update user's `currentStreak` and `lastActivityDate` using streak calculation logic
- [x] Call `checkAchievementsForEvent(database, userId, 'transaction_created')` after streak update
- [x] Include `achievementsUnlocked: []` array in success response (empty array if none unlocked)
- [x] Manual test: first transaction unlocks `first-transaction`
- [x] Manual test: logging transactions on consecutive days increments streak, unlocks `7-day-streak` at 7, `30-day-streak` at 30
- [x] Manual test: gap > 1 day resets streak to 1
- [x] Manual test: 10th transaction unlocks `10-transactions`
