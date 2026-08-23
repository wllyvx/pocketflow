# 08: My Achievements Page (Frontend)

**What to build:** A dedicated page at `/achievements` showing all achievements grouped by tier, with locked/unlocked visual states.

**Blocked by:** 03 (needs GET /achievements endpoint), 07 (needs shared types)

**Status:** completed

- [x] Create `apps/web/src/pages/achievements.astro`
- [x] Fetch achievements from `GET /achievements` API endpoint
- [x] Display achievements grouped by tier (Tier 1 — First Steps, Tier 2 — Consistency & Habits, Tier 3 — Mastery)
- [x] Each achievement shows: icon, name, description, unlock status
- [x] Locked achievements are visually distinct (grayscale icon, muted text, no unlock timestamp)
- [x] Unlocked achievements show full color icon, bold name, and unlock timestamp ("Unlocked on Aug 20, 2026")
- [x] Follow DESIGN.md spacing (4px grid), typography (Inter font), and color palette
- [x] Responsive layout: mobile-first, works on desktop
- [x] Add navigation link to achievements page from user profile/header menu
