# 01: Health Bar Calculation Foundation

**What to build:** A tested, reusable health calculation utility that takes budget and current amounts and returns health status, percentage, colors, and badge data. Backend can import and use it; frontend will consume it in later tickets.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

## Acceptance Criteria

- [ ] `packages/shared/src/envelope-health.ts` exports `calculateEnvelopeHealth()` function
- [ ] Returns correct `HealthStatus` for all 6 states (surplus, healthy, low, depleted, over-spending, not-funded)
- [ ] Returns correct percentage (0-100, capped at 100 for display)
- [ ] Returns correct colors for each state:
  - healthy: `#10b981` (Tailwind green-500)
  - low: `#f59e0b` (Tailwind amber-500)
  - depleted: `#ef4444` (Tailwind red-500)
  - over-spending: `#ef4444` (Tailwind red-500)
  - surplus: `#4f46e5` (primary.500)
  - not-funded: `#6b7280` (Tailwind gray-500)
- [ ] Returns badge data (text, colors, showBadge flag)
- [ ] Calculates `spent`, `surplus`, and `overSpending` amounts correctly
- [ ] 6 unit tests pass covering all states:
  1. Not Funded: `budgetedAmount = 1000, currentAmount = 0`
  2. Surplus: `budgetedAmount = 1000, currentAmount = 1500`
  3. Healthy: `budgetedAmount = 1000, currentAmount = 500`
  4. Low: `budgetedAmount = 1000, currentAmount = 200`
  5. Depleted: `budgetedAmount = 1000, currentAmount = 0` (after spending)
  6. Over Spending: `budgetedAmount = 1000, currentAmount = -200`
- [ ] Exported from `packages/shared/src/index.ts`
- [ ] Tests run successfully with `npm test` in shared package

## Implementation Notes

**Health calculation formula:**
```
healthPercentage = (currentAmount / budgetedAmount) * 100
```
Capped at 100% for display purposes.

**Status determination logic:**
1. If `currentAmount === 0 && budgetedAmount > 0` → `not-funded`
2. If `currentAmount > budgetedAmount` → `surplus`
3. If `currentAmount < 0` → `over-spending`
4. If `currentAmount === 0` → `depleted`
5. If `currentAmount <= 30% of budgetedAmount` → `low`
6. Otherwise → `healthy`

**Badge text mapping:**
- surplus → "SURPLUS"
- over-spending → "OVER SPENDING"
- not-funded → "Not Funded"
- Others → no badge (showBadge = false)

**Badge colors:**
- SURPLUS: bg `#EEF2FF`, text `#4F46E5`
- OVER SPENDING: bg `#FDE8E2`, text `#C6533D`
- Not Funded: bg `#F3F4F6`, text `#6B7280`

## Type Signature

```typescript
export type HealthStatus = 
  | 'surplus'
  | 'healthy'
  | 'low'
  | 'depleted'
  | 'over-spending'
  | 'not-funded';

export interface HealthBarData {
  percentage: number;          // 0-100, capped at 100
  status: HealthStatus;
  color: string;               // Bar fill color
  badgeColor: string;          // Badge background color
  badgeTextColor: string;      // Badge text color
  showBadge: boolean;          // Whether to show status badge
  badgeText: string;           // Badge label text
  spent: number;               // budgetedAmount - currentAmount
  surplus: number;             // If surplus, amount over budget (0 otherwise)
  overSpending: number;        // If over-spending, amount over budget (0 otherwise)
}

export function calculateEnvelopeHealth(
  budgetedAmount: number,
  currentAmount: number
): HealthBarData;
```
