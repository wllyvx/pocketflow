# 06: Budget Cycle Complete Achievement (Lazy Evaluation)

**What to build:** Users unlock `budget-cycle-complete` when logging first transaction of a new month if no envelope went negative in previous month.

**Blocked by:** 04 (needs transaction_created event handler in place)

**Status:** ready-for-agent

- [x] In `checkAchievementsForEvent` for `transaction_created`, detect month boundary (transaction date month ≠ user's lastActivityDate month)
- [x] On month boundary: query all user envelopes and all transactions in previous calendar month
- [x] Check if any envelope had `currentAmount < 0` during previous month (via transaction snapshots or aggregate logic)
- [x] If at least 1 envelope exists AND no envelope went negative: unlock `budget-cycle-complete`
- [x] Manual test: user logs transactions all month without any envelope going negative, then logs first transaction of next month → achievement unlocks
- [x] Manual test: user with zero envelopes → achievement does not unlock
- [x] Manual test: user with one envelope that went negative in previous month → achievement does not unlock
