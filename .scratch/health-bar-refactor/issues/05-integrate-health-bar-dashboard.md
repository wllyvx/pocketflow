# 05: Integrate Health Bar in Dashboard

**What to build:** The dashboard shows compact health bars (no badges, just color and percentage) that match the calculation in Manage Envelopes. Both views are now consistent.

**Blocked by:**
- 02 - Backend Health Data Pipeline
- 03 - Health Bar UI Component

**Status:** ready-for-agent

## Acceptance Criteria

- [ ] `apps/web/src/pages/index.astro` imports `EnvelopeProgress` component
- [ ] Component used with `variant="compact"`:
  ```astro
  <EnvelopeProgress 
    budgetedAmount={envelope.budgetedAmount} 
    currentAmount={envelope.currentAmount}
    variant="compact"
  />
  ```
- [ ] Old progress bar calculation code removed (lines around 78-86 with `totalSpent / budgetedAmount` logic)
- [ ] Old progress bar rendering markup removed (including the "Over budget" badge rendering)
- [ ] Component receives correct props from dashboard envelope data
- [ ] Health bars display correctly in compact mode:
  - No status badges shown (regardless of state)
  - Only bar color and percentage visible
  - Minimal spacing for compact dashboard layout
- [ ] Colors and percentages match Manage Envelopes for the same envelope:
  - Verify by checking an envelope in both views
  - Health percentage should be identical
  - Color should be identical (green/yellow/red/purple/gray)
- [ ] After adding a transaction:
  - `pocketflow:refresh-data` event triggers dashboard reload
  - Dashboard envelope health bars update automatically
  - Smooth transition animation visible
- [ ] Dashboard empty state still renders correctly (for new users with no envelopes)
- [ ] No TypeScript errors
- [ ] No console errors in browser

## Implementation Notes

**Remove these lines from index.astro:**
```javascript
const totalSpent = envelope.totalSpent ?? 0;
const percent = envelope.budgetedAmount > 0 
  ? Math.round((totalSpent / envelope.budgetedAmount) * 100) 
  : 0;
const isOverBudget = totalSpent > envelope.budgetedAmount;
```

And the corresponding progress bar + badge markup:
```astro
<div class="h-1.5 overflow-hidden rounded-full bg-[#EDF0ED]">
  <div class="..." style="width:${percent}%"></div>
</div>
{isOverBudget && <span class="...">Over budget</span>}
```

**Compact variant behavior:**
The `EnvelopeProgress` component should:
- Hide all badges when `variant="compact"`
- Still apply correct colors based on health status
- Show percentage text below bar
- Optionally hide tooltip in compact mode (or show simplified tooltip)

**Testing consistency:**
1. Create/fund an envelope
2. Check health bar on dashboard
3. Navigate to Manage Envelopes
4. Verify the same envelope shows identical health % and color
5. Log an expense
6. Verify both views update consistently

**Dashboard card layout:**
Ensure the new health bar component fits within the existing dashboard envelope card design (check spacing, alignment with other card elements).
