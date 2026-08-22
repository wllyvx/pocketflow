# 04: Integrate Health Bar in Manage Envelopes

**What to build:** The Manage Envelopes page shows correct health bars with detailed badges and tooltips. The previous buggy progress bar calculation is removed. Health bars update automatically after transactions without page refresh.

**Blocked by:** 
- 02 - Backend Health Data Pipeline
- 03 - Health Bar UI Component

**Status:** ready-for-agent

## Acceptance Criteria

- [ ] `apps/web/src/components/EnvelopeManager.astro` imports `EnvelopeProgress` component
- [ ] Component used with `variant="detailed"`:
  ```astro
  <EnvelopeProgress 
    budgetedAmount={envelope.budgetedAmount} 
    currentAmount={envelope.currentAmount}
    variant="detailed"
  />
  ```
- [ ] Old progress bar calculation code removed (lines around 65-66 with `percentage = currentAmount / budgetedAmount`)
- [ ] Old progress bar rendering markup removed
- [ ] Component receives correct props from envelope data (verify API response includes `budgetedAmount` and `currentAmount`)
- [ ] Health bars display correctly for all 6 states:
  - Create envelope without funding → gray bar + "Not Funded"
  - Allocate more than budget → purple bar + "SURPLUS"
  - Normal spending with >30% left → green bar
  - Spending with 1-30% left → yellow bar
  - Spending to exactly zero → red bar, status "Depleted"
  - Overspending (negative balance) → red bar + "OVER SPENDING" badge
- [ ] After adding a transaction via `AddTransactionModal`:
  - `pocketflow:refresh-data` event fires (existing behavior)
  - Envelope list re-fetches from API
  - Health bars update smoothly without full page refresh
- [ ] Hover tooltip shows correct data for each envelope
- [ ] No TypeScript errors
- [ ] No console errors in browser
- [ ] Visual regression check: bars match design spec (colors, spacing, badge positioning)

## Implementation Notes

**Remove these lines from EnvelopeManager.astro:**
```javascript
const percentage = item.budgetedAmount > 0 
  ? Math.round((item.currentAmount / item.budgetedAmount) * 100) 
  : 0;
```

And the corresponding progress bar rendering markup (currently using inline styles and dynamic color classes).

**Verify API response shape:**
Check that the envelope data includes:
- `budgetedAmount` (number)
- `currentAmount` (number)
- `totalSpent` (number, newly added in ticket 02)

**Testing the live update:**
1. Open Manage Envelopes page
2. Click "Add Transaction" modal
3. Log an expense to an envelope
4. Submit transaction
5. Verify health bar updates without manual page refresh
6. Verify smooth 0.3s transition animation

**Edge case to test:**
Envelope with `budgetedAmount = 0` should gracefully handle (show disabled or N/A state).
