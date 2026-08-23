# 10: Icon Library Integration & Mapping for Achievements

**What to build:** Map achievement icon identifier strings (e.g., "flame", "trophy", "folder-plus") from backend to actual icon components in the frontend.

**Blocked by:** 07 (needs achievement types), 08 (needs achievements page to render icons)

**Status:** completed

- [x] Confirm icon library choice (Lucide React or Heroicons) — check existing frontend components for consistency
- [x] Install icon library if not already present (e.g., `pnpm add lucide-react` in `apps/web`)
- [x] Create icon mapping helper function/component (e.g., `apps/web/src/lib/achievement-icons.ts`) that takes icon identifier string and returns corresponding icon component
- [x] Map all 7 achievement icons: `folder-plus` → FolderPlus, `receipt` → Receipt, `wallet` → Wallet, `flame` → Flame, `list-ordered` → ListOrdered, `shield-check` → ShieldCheck, `trophy` → Trophy
- [x] Use mapped icons in achievements page (ticket 08) and toast notification (ticket 09)
- [x] Manual test: all achievements display correct icons on `/achievements` page
