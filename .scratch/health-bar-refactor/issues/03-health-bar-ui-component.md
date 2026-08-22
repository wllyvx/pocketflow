# 03: Health Bar UI Component

**What to build:** A reusable EnvelopeProgress component that renders health bars with smooth animations, color coding, status badges, and tooltips. Can be used in compact (dashboard) or detailed (manage envelopes) modes.

**Blocked by:** 01 - Health Bar Calculation Foundation

**Status:** ready-for-agent

## Acceptance Criteria

- [ ] `apps/web/src/components/EnvelopeProgress.astro` accepts props interface:
  ```typescript
  interface Props {
    budgetedAmount: number;
    currentAmount: number;
    variant?: 'compact' | 'detailed';  // default: 'detailed'
    showBadge?: boolean;               // default: true for detailed, false for compact
    showTooltip?: boolean;             // default: true
  }
  ```
- [ ] Imports and uses `calculateEnvelopeHealth()` from `@pocketflow/shared`
- [ ] Renders health bar with correct dimensions:
  - Height: `h-1.5` (6px)
  - Width: full width of container
  - Border radius: `rounded-full`
  - Container background: `bg-[#EDF0ED]`
- [ ] Bar fill color changes based on health status (uses color from `calculateEnvelopeHealth`)
- [ ] CSS transition applied: `transition: width 0.3s ease-out`
- [ ] Status badges render conditionally:
  - SURPLUS: shown when status is 'surplus'
  - OVER SPENDING: shown when status is 'over-spending'
  - Not Funded: shown when status is 'not-funded'
  - No badge for healthy, low, depleted states
- [ ] Badge styling matches design:
  - Border radius: `rounded` (4px)
  - Padding: `px-1.5 py-1`
  - Typography: `text-[9px] font-bold`
  - Colors match spec (from `calculateEnvelopeHealth` badgeColor/badgeTextColor)
  - Positioned to the right of health bar (inline)
- [ ] CSS-only tooltip implemented (no library dependency):
  - Shows on hover over health bar
  - Displays 5 lines of data:
    ```
    💰 Budget: Rp [formatted budgetedAmount]
    💵 Current: Rp [formatted currentAmount]
    💸 Spent: Rp [formatted spent]
    📊 Health: [percentage]%
    ---
    Status: [status label]
    ```
  - Tooltip positioned above bar (or below if near top edge)
  - Dark background with white text for readability
- [ ] Variant behavior:
  - `compact`: No badges shown regardless of status, minimal spacing
  - `detailed`: Badges shown, tooltip shown, more spacing
- [ ] Component handles edge cases:
  - Zero budgetedAmount (shows "N/A" or disabled state)
  - Negative currentAmount (over-spending)
  - currentAmount > budgetedAmount (surplus, bar capped at 100%)
- [ ] No console errors or warnings

## Implementation Notes

**Tooltip CSS pattern (pure CSS, no JS):**
Use `::before` or `::after` pseudo-element with:
```css
.health-bar:hover::before {
  content: attr(data-tooltip);
  position: absolute;
  /* positioning and styling */
}
```

Store tooltip content in a `data-tooltip` attribute or build tooltip as a separate element with opacity transition on hover.

**Percentage display:**
Position below bar with `mt-2`, `text-[9px]` to match existing pattern in codebase.

**Status label mapping (for tooltip):**
- surplus → "Surplus"
- healthy → "Healthy"
- low → "Low"
- depleted → "Depleted"
- over-spending → "Over Spending"
- not-funded → "Not Funded"

**Formatting currency:**
Use existing currency formatter in the project (check for `Intl.NumberFormat` or similar utility).
