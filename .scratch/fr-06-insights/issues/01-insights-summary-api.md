# 01: Insights summary API endpoint

**What to build:** A single insights endpoint that returns spending-by-category, income-vs-expense trend buckets, and range metadata for a user-selected date range, so that any chart surface can render real aggregates. Validation enforces from ≤ to, a maximum 12-month span, and defaults to the current month when parameters are absent. Granularity is chosen automatically (daily / weekly / monthly by span) and reported back in metadata. Transfers are excluded from expense totals; zero-total categories are omitted; results are always scoped to the authenticated user. Invalid ranges return the standard error shape with a descriptive code.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Zod query schema lives in `packages/shared` (from/to optional, validated together), with contract tests alongside the existing schema tests
- [ ] Aggregation logic lives in an API service function taking db + userId + parsed query, throwing typed service errors like existing services
- [ ] Response data contains: per-category totals (id, name, total, percentage, sorted desc), income vs expense buckets (start, end, label, income total, expense total), and meta (from, to, granularity, currency)
- [ ] Auto granularity: daily when range ≤ 31 days, weekly when ≤ ~120 days, monthly beyond
- [ ] Invalid ranges (`from > to`, span > 12 months) return standard error responses with distinct codes
- [ ] All queries filter by the authenticated user's id
- [ ] Route handler stays thin and follows the existing route patterns
- [ ] Service tests cover: category aggregation/ordering, bucket math per granularity, transfer exclusion, empty-result shape, and both invalid-range errors — stubbing the database in the style of existing service tests
