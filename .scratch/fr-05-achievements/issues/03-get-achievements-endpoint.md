# 03: GET /achievements Endpoint

**What to build:** Users can retrieve all achievements with their unlock status via API.

**Blocked by:** 02 (needs service layer)

**Status:** completed

- [x] Create `apps/api/src/routes/achievements.ts` with `GET /achievements` handler
- [x] Route calls `getUserAchievements(database, userId)` from service layer
- [x] Returns flat array merging achievement definitions with user's `unlockedAt` (or null if locked)
- [x] Response follows API.md format: `{ success: true, data: [...] }`
- [x] Register route in `apps/api/src/index.ts`
- [x] Manual test with dev token returns expected structure
