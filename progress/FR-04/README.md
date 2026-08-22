# FR-04: Envelope Health Bar Refactor

**Status**: Ready for Implementation  
**Type**: Enhancement + Bug Fix  
**Priority**: High (fixes critical bug + improves UX)  
**Estimated Effort**: ~3-4 hours implementation + testing

---

## Quick Summary

This task refactors the envelope budget indicator from a "progress bar" (that fills as you spend) to a "health bar" (that depletes as you spend), fixing both a conceptual UX issue and a critical calculation bug.

### What's Wrong Now

1. **Bug**: `EnvelopeManager.astro` uses wrong formula (`currentAmount / budgetedAmount` where currentAmount = remaining balance), showing inverted percentages
2. **UX Confusion**: Progress bar psychology is backwards - filling up feels like progress, but it actually means depleting your budget
3. **Missing Backend Data**: `listEnvelopes()` doesn't return `totalSpent`, forcing frontend to use incorrect fields

### What We're Building

A "health bar" system with 6 distinct states:
- 🟢 **Healthy** (>30% remaining)
- 🟡 **Low** (1-30% remaining)  
- 🔴 **Depleted** (0%, budget exhausted)
- 🔴 **Over Spending** (negative balance, with badge)
- 🟣 **Surplus** (allocated more than budget, with badge)
- ⚪ **Not Funded** (envelope created but no allocation)

---

## Files

- **Spec**: [`health-bar-refactor-spec.md`](./health-bar-refactor-spec.md) - Complete technical specification
- **Commit**: `a0a260c` - Spec committed to main branch

---

## Key Decisions Summary

| Decision Point | Choice |
|----------------|--------|
| **Mental Model** | Health bar (100% = full, 0% = depleted) instead of progress bar |
| **Formula** | `(currentAmount / budgetedAmount) * 100` capped at 100% |
| **Terminology** | "Over Spending" instead of "Over Budget" (UI only) |
| **API Field** | Keep `isOverBudget` name, change logic to `currentAmount < 0` (backward compatible) |
| **Component** | Reusable `EnvelopeProgress.astro` with `compact`/`detailed` variants |
| **Calculation Logic** | Extract to `@pocketflow/shared/envelope-health.ts` pure function |
| **Tooltip** | Custom CSS-only (no library), shows 5 lines of budget data |
| **Colors** | Tailwind standard: green-500, amber-500, red-500, gray-500, primary-500 |
| **Transition** | 0.3s ease-out smooth animation |
| **Live Update** | Keep existing `pocketflow:refresh-data` event pattern |
| **Backend** | Update `listEnvelopes()` to include `totalSpent` aggregation |
| **Dashboard Endpoint** | Refactor to call service instead of duplicate query |
| **Tests** | Backend unit tests (6 scenarios), manual checklist (10 items) |
| **N+1 Optimization** | Out of scope (add TODO comment) |

---

## Implementation Checklist

### Phase 1: Backend Foundation
- [ ] Create `packages/shared/src/envelope-health.ts` utility
- [ ] Create `packages/shared/src/envelope-health.test.ts` with 6 test cases
- [ ] Update `packages/shared/src/index.ts` exports
- [ ] Run tests: `npm test` in shared package
- [ ] Update `apps/api/src/services/envelope.service.ts`:
  - [ ] `listEnvelopes()`: Add `totalSpent` aggregation
  - [ ] `listEnvelopes()`: Update `isOverBudget` logic + comment
  - [ ] `getEnvelopeById()`: Update `isOverBudget` logic + comment
- [ ] Update `apps/api/src/index.ts` dashboard endpoint to call service
- [ ] Run backend tests: `npm test` in api package

### Phase 2: Frontend Components
- [ ] Refactor `apps/web/src/components/EnvelopeProgress.astro`:
  - [ ] Add Props interface (budgetedAmount, currentAmount, variant, etc.)
  - [ ] Import `calculateEnvelopeHealth` from shared
  - [ ] Render health bar with dynamic color/width
  - [ ] Add CSS transition (0.3s ease-out)
  - [ ] Implement CSS-only tooltip
  - [ ] Implement status badges (SURPLUS, OVER SPENDING, Not Funded)
- [ ] Update `apps/web/src/components/EnvelopeManager.astro`:
  - [ ] Replace progress bar with `<EnvelopeProgress variant="detailed" />`
  - [ ] Remove old calculation logic
- [ ] Update `apps/web/src/pages/index.astro`:
  - [ ] Replace progress bar with `<EnvelopeProgress variant="compact" />`
  - [ ] Remove old calculation logic

### Phase 3: Manual Testing
- [ ] Test 1: Create envelope (not funded) → gray bar + "Not Funded"
- [ ] Test 2: Allocate funds → 100% green
- [ ] Test 3: Log expense → smooth transition, color changes
- [ ] Test 4: Spend to zero → 0% red + "Depleted"
- [ ] Test 5: Over-spend → 0% red + "OVER SPENDING" badge
- [ ] Test 6: Allocate > budget → 100% + "SURPLUS" badge
- [ ] Test 7: Hover tooltip → correct data
- [ ] Test 8: Dashboard vs Manage → consistent calculation
- [ ] Test 9: After transaction → auto-refresh works
- [ ] Test 10: Color thresholds → green/yellow/red at correct %

### Phase 4: Documentation
- [ ] Update `docs/REQUIREMENTS.md` (FR-03, FR-04)
- [ ] Update `docs/FEATURES.md` (Section 4)
- [ ] Update `docs/API.md` (GET /api/envelopes schema)
- [ ] Update `docs/DATABASE.md` (currentAmount clarification)
- [ ] Update `docs/ROADMAP.md` (FR-04 reference)

---

## Success Criteria

✅ All 6 health states render correctly with proper colors and badges  
✅ Health bar updates smoothly after transactions without page refresh  
✅ Tooltip shows accurate budget data on hover  
✅ Backend unit tests pass (6 test cases)  
✅ Manual testing checklist complete (10 items)  
✅ Dashboard and Manage Envelopes use consistent calculation  
✅ All 5 contract files updated with new terminology  
✅ No console errors or TypeScript errors  

---

## Notes for Implementation

- **Start with backend**: Ensure data layer is correct before touching UI
- **Test incrementally**: Run tests after each phase
- **Check shared package build**: Ensure `envelope-health.ts` exports correctly
- **Verify TypeScript**: Run `npm run type-check` in workspace root
- **CSS transition**: Test on actual data changes, not just on page load
- **Tooltip positioning**: Test near viewport edges for overflow handling

---

## Related Documentation

- Full Spec: [`health-bar-refactor-spec.md`](./health-bar-refactor-spec.md)
- Original Requirements: [`../../docs/REQUIREMENTS.md`](../../docs/REQUIREMENTS.md)
- Architecture: [`../../docs/ARCHITECTURE.md`](../../docs/ARCHITECTURE.md)
- Previous FR-03 Work: [`../FR-03/task.md`](../FR-03/task.md)

---

## Questions or Issues?

Refer to the design decisions in the full spec. All 45 design tree questions have been answered and documented.

**Design Session**: 2026-08-22  
**Spec Author**: Kiro (AI-assisted design with user wllyvx)
