# 06: Manual Testing & Documentation

**What to build:** Complete manual testing verification across all health states and user flows. All contract documentation updated with new terminology and behavior.

**Blocked by:**
- 04 - Integrate Health Bar in Manage Envelopes
- 05 - Integrate Health Bar in Dashboard

**Status:** ready-for-agent

## Acceptance Criteria

### Manual Testing (10 scenarios)

- [ ] **Test 1 - Not Funded**: Create envelope with budget but no allocation → gray bar + "Not Funded" badge (detailed view only)
- [ ] **Test 2 - Surplus**: Allocate funds exceeding budget → purple bar capped at 100% + "SURPLUS" badge + tooltip shows surplus amount
- [ ] **Test 3 - Healthy to Low transition**: Log expenses that reduce health from >30% to 1-30% → smooth color transition from green to yellow
- [ ] **Test 4 - Depleted**: Spend exactly to zero → red bar at 0% + status "Depleted" (no over-spending badge)
- [ ] **Test 5 - Over Spending**: Continue spending past zero → red bar at 0% + "OVER SPENDING" badge + tooltip shows negative amount
- [ ] **Test 6 - Tooltip data accuracy**: Hover over health bar → tooltip displays correct budget, current, spent, health %, and status label
- [ ] **Test 7 - View consistency**: Check same envelope in dashboard and manage envelopes → identical health % and color (dashboard compact, manage detailed)
- [ ] **Test 8 - Live update**: Log transaction → health bar updates within 1 second without manual page refresh
- [ ] **Test 9 - Color thresholds**: Verify green at 31%+, yellow at 1-30%, red at 0% (test by spending incrementally)
- [ ] **Test 10 - Multiple envelopes**: Create 3 envelopes in different states → all display correct health bars simultaneously

### Documentation Updates

- [ ] **`docs/REQUIREMENTS.md`** updated:
  - FR-03 (line 54-62): Change acceptance criteria to describe health bar behavior
  - FR-04 (line 63-69): Update from "progress bar" to "health bar", update color thresholds description
  - Change terminology: "over-budget" → "over-spending" in all mentions
- [ ] **`docs/FEATURES.md`** updated:
  - Section 4 (Envelope Budgeting System, lines 74-100): Update UI description to health bar concept
  - Update edge case handling (line 96): "over-budget" → "over-spending"
  - Add description of 6 health states
- [ ] **`docs/API.md`** updated:
  - GET /api/envelopes response schema (lines 140+): Add `totalSpent` field
  - Add prominent note explaining `isOverBudget` field logic change: "Note: `isOverBudget` now indicates `currentAmount < 0` (negative balance / over-spending), not `totalSpent > budgetedAmount` as before. Field name kept for backward compatibility."
  - Update example responses to include `totalSpent`
- [ ] **`docs/DATABASE.md`** updated:
  - Envelope table schema section (lines 137-153): Add clarification on `currentAmount` semantics
  - Add note: "`currentAmount` represents remaining balance in the envelope. Spent amount is calculated as `budgetedAmount - currentAmount`."
- [ ] **`docs/ROADMAP.md`** updated:
  - FR-04 dashboard requirement (line 32): Change "progress bar envelope" to "health bar envelope"
  - Update terminology throughout

### Quality Checks

- [ ] No console errors in browser (check both dashboard and manage envelopes pages)
- [ ] No console warnings
- [ ] Run `npm run type-check` in workspace root → passes without errors
- [ ] Run `npm run build` in workspace root → builds successfully
- [ ] Backend tests pass: `npm test` in `apps/api`
- [ ] Shared package tests pass: `npm test` in `packages/shared`

## Implementation Notes

**Manual testing setup:**
1. Start with clean database or reset test envelopes
2. Have at least 1000 budget amount to easily test percentage thresholds
3. Use incremental expenses to watch smooth transitions
4. Test on both views (dashboard and manage envelopes) for each scenario

**Documentation language:**
- `REQUIREMENTS.md`: Indonesian
- `FEATURES.md`: Indonesian
- `API.md`: English
- `DATABASE.md`: English
- `ROADMAP.md`: Indonesian

Keep each file's existing language as per design decision.

**Terminology replacement:**
- "Over Budget" → "Over Spending" (user-facing)
- "over-budget" → "over-spending" (technical docs)
- "progress bar" → "health bar"

**Search and replace carefully:**
Use case-sensitive search to avoid changing unrelated terms. Review each change in context.

**Testing checklist format:**
Create a markdown checklist document under `progress/FR-04/` with all 10 test scenarios and their pass/fail results. This serves as evidence of testing completion.
