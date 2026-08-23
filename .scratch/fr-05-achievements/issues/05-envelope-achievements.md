# 05: Envelope Achievement Checks (First Envelope, All Envelopes Funded)

**What to build:** Achievements unlock when users create or fund envelopes (first-envelope, all-envelopes-funded). Response includes `achievementsUnlocked` array.

**Blocked by:** 02 (needs service layer)

**Status:** ready-for-agent

- [ ] In `POST /envelopes` route handler (after successful envelope create), call `checkAchievementsForEvent(database, userId, 'envelope_created')`
- [ ] In `POST /envelopes/:id/fill` route handler (after successful fill), call `checkAchievementsForEvent(database, userId, 'envelope_funded')`
- [ ] Include `achievementsUnlocked: []` array in success response for both endpoints
- [ ] Manual test: first envelope creation unlocks `first-envelope`
- [ ] Manual test: funding all envelopes (currentAmount > 0 for all) unlocks `all-envelopes-funded`
- [ ] Manual test: if user has zero envelopes, `all-envelopes-funded` does not unlock
