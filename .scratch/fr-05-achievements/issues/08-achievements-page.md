# 08: My Achievements Page (Frontend)

**What to build:** A dedicated page at `/achievements` showing all achievements grouped by tier, with locked/unlocked visual states.

**Blocked by:** 03 (needs GET /achievements endpoint), 07 (needs shared types)

**Status:** ready-for-agent

- [ ] Create `apps/web/src/pages/achievements.astro`
- [ ] Fetch achievements from `GET /achievements` API endpoint
- [ ] Display achievements grouped by tier (Tier 1 — First Steps, Tier 2 — Consistency & Habits, Tier 3 — Mastery)
- [ ] Each achievement shows: icon, name, description, unlock status
- [ ] Locked achievements are visually distinct (grayscale icon, muted text, no unlock timestamp)
- [ ] Unlocked achievements show full color icon, bold name, and unlock timestamp ("Unlocked on Aug 20, 2026")
- [ ] Follow DESIGN.md spacing (4px grid), typography (Inter font), and color palette
- [ ] Responsive layout: mobile-first, works on desktop
- [ ] Add navigation link to achievements page from user profile/header menu
