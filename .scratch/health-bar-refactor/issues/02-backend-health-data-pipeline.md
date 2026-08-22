# 02: Backend Health Data Pipeline

**What to build:** Backend API returns complete health data (including `totalSpent`) for all envelopes. The `isOverBudget` field now correctly reflects negative balance. Dashboard endpoint uses the service layer instead of duplicate queries.

**Blocked by:** 01 - Health Bar Calculation Foundation

**Status:** ready-for-agent

## Acceptance Criteria

- [ ] `listEnvelopes()` service method includes `totalSpent` aggregation query using Drizzle ORM
- [ ] Aggregation uses efficient SQL: `SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END)`
- [ ] `listEnvelopes()` calculates `isOverBudget` as `currentAmount < 0` (not `totalSpent > budgetedAmount`)
- [ ] `getEnvelopeById()` calculates `isOverBudget` as `currentAmount < 0`
- [ ] Both methods include explanatory comment: "Field name 'isOverBudget' kept for backward compatibility; logic changed to reflect currentAmount < 0 (over-spending), not totalSpent > budget"
- [ ] Dashboard endpoint (`apps/api/src/index.ts` lines 174-189) refactored to call `envelopeService.listEnvelopes()` instead of duplicate query
- [ ] Dashboard endpoint duplicate query code removed (Promise.all loop with individual queries)
- [ ] TODO comment added near dashboard endpoint: "// TODO: Optimize N+1 query pattern in listEnvelopes if performance becomes issue"
- [ ] Existing backend service tests updated and passing
- [ ] `GET /api/envelopes` response includes `totalSpent` field in JSON
- [ ] Backend builds without TypeScript errors

## Implementation Notes

**Query pattern to follow:**
Look at existing `getEnvelopeById()` method (lines 77-98 in `envelope.service.ts`) for the aggregation pattern. Apply the same approach to `listEnvelopes()`.

**Service method signature should return:**
```typescript
{
  id: string;
  name: string;
  categoryId: string;
  budgetedAmount: number;
  currentAmount: number;
  resetFrequency: string;
  totalSpent: number;        // NEW
  isOverBudget: boolean;     // MODIFIED LOGIC
}
```

**Dashboard endpoint refactor:**
Replace the `Promise.all` loop with:
```typescript
const envelopes = await envelopeService.listEnvelopes(userId);
```

The service already returns the shaped data needed for the response.

**Testing:**
Update `envelope.service.test.ts` to verify:
- `totalSpent` aggregation is correct
- `isOverBudget` returns true when `currentAmount < 0`, false otherwise
- Edge case: envelope with no transactions (totalSpent = 0)
