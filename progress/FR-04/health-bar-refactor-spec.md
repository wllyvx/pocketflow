# Spec: Envelope Health Bar Refactor

**Feature ID:** FR-04 Enhancement  
**Status:** ready-for-agent  
**Created:** 2026-08-22  
**Type:** Enhancement + Bug Fix

---

## Problem Statement

Users are confused by the current envelope budgeting progress bar behavior. The existing implementation has two critical issues:

1. **Conceptual confusion**: The progress bar fills up as users spend money, making it feel like "progress" towards exhausting the budget rather than tracking budget health. This creates negative psychological reinforcement.

2. **Technical bug**: The `EnvelopeManager.astro` component incorrectly calculates progress using `currentAmount / budgetedAmount` (where `currentAmount` is the remaining balance), which produces inverted results. When users have spent 80% of their budget, the bar shows only 20% filled.

Additionally, the backend `listEnvelopes()` service method does not include `totalSpent` data, forcing the frontend to use incorrect fields for calculations.

## Solution

Redesign the envelope budget indicator as a **"health bar"** that conceptually represents the financial health of each envelope:

- **Full bar (100%) = healthy**: The envelope is fully funded
- **Bar decreases with spending**: As expenses are logged, the health bar depletes
- **Empty bar (0%) = depleted**: Budget is exhausted (but not yet overspending)
- **Negative balance = "Over Spending"**: A distinct visual state with badge indicator

This mental model aligns with gaming health bars that users intuitively understand, and correctly reflects that decreasing funds = decreasing health.

The implementation will also fix the underlying bug by ensuring all components use consistent, correct calculations based on `currentAmount` and `budgetedAmount` fields.

## User Stories

1. As a user, I want to see a health bar that starts at 100% when my envelope is fully funded, so that I understand my budget is in good shape.

2. As a user, I want the health bar to decrease smoothly when I log an expense, so that I get immediate visual feedback on my spending impact.

3. As a user, I want the health bar color to change from green to yellow to red as my budget depletes, so that I can quickly assess which envelopes need attention.

4. As a user, I want to see a "SURPLUS" badge when I've allocated more money than my budget target, so that I know I'm over-funded in a positive way.

5. As a user, I want to see an "OVER SPENDING" badge when I've spent more than my budget, so that I'm clearly alerted to overspending situations.

6. As a user, I want to see a "Not Funded" state when I create an envelope but haven't allocated money to it yet, so that I understand it's inactive.

7. As a user, I want to see a "Depleted" state when my envelope reaches zero balance, so that I know my budget is fully used but not yet overspent.

8. As a user, I want to hover over the health bar and see detailed budget information (budgeted amount, current amount, spent amount, health percentage, status), so that I can understand the exact state without guessing.

9. As a user, I want the health bar to update immediately after logging a transaction without needing to refresh the page, so that my workflow is smooth and uninterrupted.

10. As a user, I want to see consistent health bar behavior across the dashboard and manage envelopes views, so that I don't get confused by different representations.

11. As a user viewing the dashboard, I want to see a compact health bar with just the percentage, so that I can quickly scan multiple envelopes without visual clutter.

12. As a user in the manage envelopes section, I want to see a detailed health bar with status badges and tooltips, so that I can get full information when managing my budget.

13. As a user, I want the health bar to be green when I have more than 30% of my budget remaining, so that I know I'm in a healthy state.

14. As a user, I want the health bar to turn yellow when I have 1-30% of my budget remaining, so that I get a warning to be careful with spending.

15. As a user, I want the health bar to turn red when my budget is depleted or overspent, so that I'm clearly alerted to take action.

16. As a user, I want the health bar transition to be smooth (not instant), so that the change feels polished and I can perceive the movement.

17. As a user who allocates more funds than my budget target, I want to see a purple/indigo visual indicator, so that I can distinguish surplus from normal healthy state.

18. As a developer, I want health bar calculation logic to be in a single reusable utility function, so that all views use consistent calculations and the code is maintainable.

19. As a developer, I want the backend to provide `totalSpent` data in the list envelopes endpoint, so that the frontend doesn't need to make incorrect calculations.

20. As a developer, I want comprehensive unit tests for the health calculation logic, so that future changes don't break the behavior.

21. As a user with multiple envelopes, I want the envelope list data to be fetched efficiently in a single query, so that the interface remains responsive.

22. As a user, I want status labels in English ("Healthy", "Low", "Depleted", "Surplus", "Over Spending"), so that the terminology is clear and consistent.

23. As a user, I want to understand that "Over Spending" means I've spent beyond my budget, so that the terminology accurately describes the problem.

24. As a maintainer reading the code, I want clear comments explaining why `isOverBudget` field name doesn't match the "Over Spending" UI label, so that I understand the backward compatibility decision.

25. As a user creating my first envelope, I want to see helpful visual states that guide me through funding and using it, so that I learn the system naturally.

## Implementation Decisions

### 1. Health Bar Calculation Logic

**Module**: `packages/shared/src/envelope-health.ts` (new file)

Create a pure utility function that encapsulates all health bar calculation logic:

```typescript
export type HealthStatus = 
  | 'surplus'        // currentAmount > budgetedAmount
  | 'healthy'        // currentAmount > 30% of budgetedAmount
  | 'low'            // currentAmount = 1-30% of budgetedAmount
  | 'depleted'       // currentAmount = 0
  | 'over-spending'  // currentAmount < 0
  | 'not-funded';    // currentAmount = 0 AND budgetedAmount > 0 (initial state)

export interface HealthBarData {
  percentage: number;          // 0-100, capped at 100 for display
  status: HealthStatus;
  color: string;               // Tailwind color for bar fill
  badgeColor: string;          // Badge background color
  badgeTextColor: string;      // Badge text color
  showBadge: boolean;          // Whether to show status badge
  badgeText: string;           // Badge label text
  spent: number;               // Calculated spent amount
  surplus: number;             // If surplus, amount over budget (0 otherwise)
  overSpending: number;        // If over-spending, amount over budget (0 otherwise)
}

export function calculateEnvelopeHealth(
  budgetedAmount: number,
  currentAmount: number
): HealthBarData;
```

**Formula**:
- `healthPercentage = (currentAmount / budgetedAmount) * 100`
- Capped at 100% for display (even if surplus)
- Distinguished from old progress bar formula: `(totalSpent / budgetedAmount) * 100`

**Status determination**:
1. If `currentAmount === 0 && budgetedAmount > 0` → `not-funded`
2. If `currentAmount > budgetedAmount` → `surplus`
3. If `currentAmount < 0` → `over-spending`
4. If `currentAmount === 0` → `depleted`
5. If `currentAmount <= 30% of budgetedAmount` → `low`
6. Otherwise → `healthy`

**Color mapping**:
- `healthy`: `#10b981` (Tailwind green-500)
- `low`: `#f59e0b` (Tailwind amber-500)
- `depleted`: `#ef4444` (Tailwind red-500)
- `over-spending`: `#ef4444` (Tailwind red-500) + badge
- `surplus`: `#4f46e5` (primary.500 from config)
- `not-funded`: `#6b7280` (Tailwind gray-500)

### 2. Backend Service Layer Changes

**Module**: `apps/api/src/services/envelope.service.ts`

**Method: `listEnvelopes()`**
- Add aggregation query to calculate `totalSpent` per envelope (similar to existing `getEnvelopeById()` implementation)
- Use Drizzle ORM's SQL aggregate: `SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END)`
- Update `isOverBudget` calculation from `totalSpent > budgetedAmount` to `currentAmount < 0`
- Add comment explaining: "Field name 'isOverBudget' kept for backward compatibility; logic changed to reflect currentAmount < 0 (over-spending), not totalSpent > budget"

**Method: `getEnvelopeById()`**
- Update `isOverBudget` calculation to match `listEnvelopes()`: `currentAmount < 0`
- Add same explanatory comment

**Query optimization note**:
- Current dashboard endpoint has N+1 query pattern (loops envelopes and queries spending individually)
- This refactor does NOT optimize that (separate concern)
- Add TODO comment: "// TODO: Optimize dashboard endpoint to use single JOIN + GROUP BY query instead of Promise.all loop"

### 3. Frontend Reusable Component

**Module**: `apps/web/src/components/EnvelopeProgress.astro` (refactor existing minimal component)

Transform into a fully functional reusable component:

```typescript
interface Props {
  budgetedAmount: number;
  currentAmount: number;
  variant?: 'compact' | 'detailed';  // default: 'detailed'
  showBadge?: boolean;               // default: true for detailed, false for compact
  showTooltip?: boolean;             // default: true
}
```

**Implementation**:
- Import `calculateEnvelopeHealth` from `@pocketflow/shared`
- Render health bar with dynamic width, color, and transition
- CSS transition: `transition: width 0.3s ease-out;`
- Render status badge conditionally based on `showBadge` and status
- Implement CSS-only tooltip (no library dependency, consistent with vanilla JS approach)

**Tooltip content** (5 lines):
```
💰 Budget: Rp 1.000.000
💵 Current: Rp 750.000
💸 Spent: Rp 250.000
📊 Health: 75%
---
Status: Healthy
```

**Badge styling**:
- Rounded rectangles: `rounded` (4px border-radius)
- Padding: `px-1.5 py-1` (6px horizontal, 4px vertical)
- Typography: `text-[9px] font-bold`
- Colors by status:
  - SURPLUS: bg `#EEF2FF`, text `#4F46E5`
  - OVER SPENDING: bg `#FDE8E2`, text `#C6533D`
  - Not Funded: bg `#F3F4F6`, text `#6B7280`

### 4. Frontend Page Updates

**Modules**: 
- `apps/web/src/components/EnvelopeManager.astro`
- `apps/web/src/pages/index.astro`

**Changes**:
- Replace existing progress bar rendering with `<EnvelopeProgress />` component
- `EnvelopeManager.astro`: Use `variant="detailed"` (shows badges and tooltip)
- `index.astro`: Use `variant="compact"` (minimal, just bar and percentage)
- Remove duplicate calculation logic (now handled by component)
- Ensure components receive correct props: `budgetedAmount` and `currentAmount`

### 5. Live Update Mechanism

**Module**: `apps/web/src/components/AddTransactionModal.astro`

**Current behavior**: Modal dispatches `pocketflow:refresh-data` custom event after successful transaction POST.

**Decision**: Keep existing event-driven refresh pattern (no changes needed).

**Rationale**: Simple, consistent with existing architecture. The dashboard and envelope manager already listen to this event. Performance acceptable for typical user with <10 envelopes.

**Enhancement**: Add visual loading state during re-fetch to indicate update in progress (optional UX polish).

### 6. API Contract Changes

**Endpoint**: `GET /api/envelopes`

**Response schema update**:
```typescript
{
  id: string;
  name: string;
  categoryId: string;
  budgetedAmount: number;
  currentAmount: number;
  resetFrequency: string;
  totalSpent: number;        // NEW: aggregated from transactions
  isOverBudget: boolean;     // MODIFIED LOGIC: now means currentAmount < 0
}
```

**Note**: `isOverBudget` field name unchanged (backward compatible), but calculation logic changed. This is a semantic breaking change documented in API.md.

### 7. Documentation Updates

**Modules**: All contract files in `docs/`

Update terminology from "Over Budget" to "Over Spending" and describe health bar behavior:

1. **`REQUIREMENTS.md`** (Indonesian):
   - FR-03: Update acceptance criteria to reflect health bar behavior
   - FR-04: Update progress bar description to "health bar" with new color thresholds

2. **`FEATURES.md`** (Indonesian):
   - Section 4 (Envelope Budgeting): Update UI description and edge cases
   - Update visual indicator terminology

3. **`API.md`** (English):
   - Update `GET /api/envelopes` response schema to include `totalSpent`
   - Add prominent note explaining `isOverBudget` field logic change
   - Update example responses

4. **`DATABASE.md`** (English):
   - Add clarification on `currentAmount` semantics (remaining balance, not spent amount)
   - Explain relationship: `spent = budgetedAmount - currentAmount`

5. **`ROADMAP.md`** (Indonesian):
   - Update FR-04 dashboard requirement to reference "health bar"

### 8. Shared Type Exports

**Module**: `packages/shared/src/index.ts`

Export new types and utility:
```typescript
export { 
  calculateEnvelopeHealth,
  type HealthBarData,
  type HealthStatus 
} from './envelope-health';
```

Ensure proper build configuration in `packages/shared/package.json` and `tsconfig.json`.

### 9. Styling Decisions

**Bar dimensions**:
- Height: `h-1.5` (6px, matches existing progress bar)
- Width: Full width of container
- Border radius: `rounded-full` (fully rounded caps)
- Background container: `bg-[#EDF0ED]` (existing light gray)

**Text positioning**:
- Percentage text: Below bar with `mt-2` (8px margin-top), `text-[9px]`
- Badge: Positioned to the right of the bar (inline)

**Transition timing**: `0.3s ease-out` for width changes

### 10. State Management

**Approach**: Vanilla JavaScript with custom events (existing pattern)

No new state management library needed. Continue using:
- Script-level variables for component state
- `pocketflow:*` custom events for inter-component communication
- Native DOM APIs for updates

### 11. Dashboard Endpoint Refactor

**Module**: `apps/api/src/index.ts` (dashboard endpoint, lines 174-189)

**Current implementation**: Duplicate query logic (loops envelopes, queries spending individually)

**Decision**: Refactor to call `envelopeService.listEnvelopes()` instead of duplicating queries.

**Rationale**: 
- Single source of truth
- Eliminate duplicate `isOverBudget` calculation logic
- `listEnvelopes()` will provide all needed data after our updates
- DRY principle

**Implementation**:
- Replace `Promise.all` loop with call to `await envelopeService.listEnvelopes(userId)`
- Remove duplicate query and calculation code
- Service method already returns shaped data ready for response

## Testing Decisions

### What Makes a Good Test

Tests should verify **external behavior** (inputs → outputs, state changes, side effects) rather than implementation details (private methods, internal state, specific algorithm steps).

For this feature:
- Test calculation logic with various input scenarios
- Test that backend queries produce expected aggregations
- Do NOT test CSS classes, specific DOM structure, or component internals

### Backend Unit Tests

**Module**: `packages/shared/src/envelope-health.test.ts` (new file)

**Framework**: Vitest (already configured in backend)

**Test cases** (6 scenarios):
1. **Not Funded**: `budgetedAmount = 1000, currentAmount = 0` → status `not-funded`, percentage 0, gray color, badge "Not Funded"
2. **Surplus**: `budgetedAmount = 1000, currentAmount = 1500` → status `surplus`, percentage 100 (capped), primary color, badge "SURPLUS", surplus = 500
3. **Healthy**: `budgetedAmount = 1000, currentAmount = 500` → status `healthy`, percentage 50, green color, no badge
4. **Low**: `budgetedAmount = 1000, currentAmount = 200` → status `low`, percentage 20, yellow color, no badge
5. **Depleted**: `budgetedAmount = 1000, currentAmount = 0` (after spending) → status `depleted`, percentage 0, red color, no badge
6. **Over Spending**: `budgetedAmount = 1000, currentAmount = -200` → status `over-spending`, percentage 0, red color, badge "OVER SPENDING", overSpending = 200

**Prior art**: See `apps/api/src/services/envelope.service.test.ts` for existing service test patterns.

### Backend Service Tests

**Module**: `apps/api/src/services/envelope.service.test.ts` (update existing)

Add test cases for updated `listEnvelopes()` and `getEnvelopeById()`:
- Verify `totalSpent` aggregation is correct
- Verify `isOverBudget` returns `true` when `currentAmount < 0`, `false` otherwise
- Test edge case: envelope with no transactions (totalSpent = 0)

### Manual Testing Checklist

A comprehensive 10-item checklist covering all states and interactions:

1. ✅ Create envelope (not funded) → bar gray + "Not Funded"
2. ✅ Allocate funds → health bar 100% green
3. ✅ Log expense → bar decreases smoothly, color changes at thresholds
4. ✅ Spend to zero → bar 0% red + "Depleted" status
5. ✅ Over-spend → bar 0% red + badge "OVER SPENDING" + tooltip shows amount
6. ✅ Allocate > budget (surplus) → bar 100% + badge "SURPLUS" + tooltip shows surplus
7. ✅ Hover tooltip → correct data displayed (budget, current, spent, health, status)
8. ✅ Dashboard vs Manage Envelopes → consistent calculation, different detail level
9. ✅ After transaction → envelope updates without manual refresh
10. ✅ Color thresholds → verify green >30%, yellow 1-30%, red ≤0%

### Frontend Testing

**Decision**: No component tests for MVP.

**Rationale**: 
- Frontend has no test infrastructure (no Vitest/Jest setup for Astro components)
- Setting up Astro component testing is significant overhead
- Calculation logic is tested via shared package unit tests
- Visual behavior verified via manual testing checklist

**Future consideration**: If component tests become priority, consider extracting visual regression tests or setting up `@astrojs/test`.

## Out of Scope

The following are explicitly **not** included in this refactor:

1. **N+1 Query Optimization**: Optimizing the dashboard endpoint's `Promise.all` loop into a single `JOIN + GROUP BY` query is a separate performance task. A TODO comment will be added for tracking.

2. **Real-time Updates**: WebSocket or Server-Sent Events for live updates across multiple tabs/devices. Current refresh-on-action pattern is sufficient for single-user, single-session use case.

3. **Integration/E2E Tests**: Automated tests that verify full transaction → health bar update flow. Manual testing checklist covers this for MVP.

4. **Envelope Budget Reset Logic**: Automated reset of envelope budgets based on `resetFrequency` (monthly/weekly). This is existing functionality not touched by health bar refactor.

5. **Plaid Integration**: Automated transaction sync affects envelopes but is a separate Fase 2 feature per ROADMAP.md.

6. **Achievement System Updates**: Achievements based on envelope health (e.g., "Maintained healthy envelopes for 30 days") are potential future enhancements, not part of this refactor.

7. **Accessibility Enhancements**: While color coding is clear, additional ARIA labels, screen reader announcements, or high-contrast mode are not included in this scope.

8. **Mobile-Specific UI**: Health bar should work on mobile (responsive), but mobile-specific interactions (swipe gestures, touch optimizations) are not part of this refactor.

9. **Historical Health Tracking**: Showing envelope health trend over time (e.g., "your envelope health decreased 20% this week"). This is a potential reporting feature, not core health bar functionality.

10. **Notification System**: Push notifications or in-app alerts when envelope health reaches critical levels. Separate feature.

11. **Internationalization (i18n)**: Status labels are in English. Localization to Indonesian or other languages is a separate concern.

12. **Shadcn/UI Component Migration**: While the user mentioned having Shadcn installed, this refactor uses custom CSS-only tooltips and badges consistent with existing vanilla JS approach. Shadcn component migration is a separate architectural decision.

## Further Notes

### Backward Compatibility Consideration

The `isOverBudget` field name is kept in the API response despite the semantic shift from "spent exceeds budget" to "current balance is negative". This decision prioritizes:
- Minimizing refactor scope (avoiding frontend field name changes)
- Pragmatic approach for internal app (not public API)
- Clear documentation and comments to prevent future confusion

If this were a public API, a proper deprecation cycle with both `isOverBudget` (old) and `isOverSpending` (new) fields would be recommended.

### Performance Note

The backend aggregation query (`SUM(CASE WHEN...)`) is efficient and suitable for D1/SQLite. For typical users with <100 transactions per envelope, query performance is sub-millisecond. No indexing changes needed at this scale.

### Design System Evolution

This refactor introduces new visual states (surplus, not funded, depleted) with specific color meanings. These should be documented as part of the app's design system for future features to maintain consistency.

### User Communication

When deploying this change, consider:
- In-app changelog or update notice explaining the new health bar concept
- Optional tooltip on first load: "New! Budget health bars now show remaining funds"
- Help docs update with screenshots of different health states

The terminology shift from "Over Budget" to "Over Spending" is more semantically accurate and should be highlighted as a user-facing improvement.

### Implementation Order

Recommended sequence (from design tree Round 5):
1. Create shared package utility (`envelope-health.ts`) + backend tests
2. Update backend service (`envelope.service.ts`) for `listEnvelopes()` + `getEnvelopeById()`
3. Refactor dashboard endpoint to use service method
4. Create/refactor `EnvelopeProgress.astro` component with health bar logic
5. Update `EnvelopeManager.astro` to use new component
6. Update `index.astro` (dashboard) to use new component
7. Manual testing against 10-item checklist
8. Update all 5 contract files (REQUIREMENTS.md, FEATURES.md, API.md, DATABASE.md, ROADMAP.md)

This sequence ensures:
- Tested foundation before UI changes
- Single source of truth established early
- Frontend changes can proceed with confidence in backend correctness
- Documentation updated after implementation verified

---

**End of Spec**
