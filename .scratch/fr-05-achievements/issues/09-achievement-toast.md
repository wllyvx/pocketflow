# 09: Achievement Unlock Toast Notification (Frontend)

**What to build:** When a user unlocks an achievement via any mutating API call (POST transaction, POST envelope, etc.), show a celebratory toast notification in the UI.

**Blocked by:** 04 and 05 (needs `achievementsUnlocked` array in API responses), 07 (needs shared types)

**Status:** ready-for-agent

- [ ] Create a reusable toast notification component (e.g., `apps/web/src/components/AchievementToast.astro` or `.tsx` if using a client-side framework)
- [ ] Component accepts achievement data (icon, name, description) as props
- [ ] Toast appears at top-right or bottom-center of screen for 4-5 seconds, then auto-dismisses
- [ ] Visual style: celebratory (e.g., success color from DESIGN.md, subtle animation/slide-in), includes achievement icon and name
- [ ] Update API client wrappers (e.g., `apps/web/src/lib/api-client.ts`) to check for `achievementsUnlocked` array in responses from POST /transactions, POST /envelopes, POST /envelopes/:id/fill
- [ ] When `achievementsUnlocked` array is non-empty, trigger toast for each achievement (with slight delay if multiple)
- [ ] Manual test: create first envelope → toast appears with "First Envelope Created"
- [ ] Manual test: log first transaction → toast appears with "First Transaction Logged"
- [ ] Manual test: unlock 7-day-streak → toast appears with "7-Day Logging Streak"
