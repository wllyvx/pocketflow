# 03: GET /achievements Endpoint

**What to build:** Users can retrieve all achievements with their unlock status via API.

**Blocked by:** 02 (needs service layer)

**Status:** ready-for-agent

- [ ] Create `apps/api/src/routes/achievements.ts` with `GET /achievements` handler
- [ ] Route calls `getUserAchievements(database, userId)` from service layer
- [ ] Returns flat array merging achievement definitions with user's `unlockedAt` (or null if locked)
- [ ] Response follows API.md format: `{ success: true, data: [...] }`
- [ ] Register route in `apps/api/src/index.ts`
- [ ] Manual test with dev token returns expected structure
