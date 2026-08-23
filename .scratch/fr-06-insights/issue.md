---
title: FR-06 Financial Insights & Reporting (MVP: category + trend + dynamic date range)
labels: [done]
status: closed
---

# FR-06 Financial Insights & Reporting

> **Closed:** All child tickets (01–05) implemented and committed. Net worth deferred to Phase 2 per roadmap; docs synced (USER_FLOW §6 stacked sections, REQUIREMENTS FR-06 annotations, ROADMAP 1d ticked). Manual E2E pass pending user verification with real accounts.

## Problem Statement

Users record their daily income and expenses into envelopes, but the only place any of that history becomes visible is a static, hard-coded "Spending rhythm" chart on the Dashboard. The user cannot answer basic questions about their own money: "Where did my spending go last month?", "Am I earning more than I spend over time?", "How does this month compare to the last three months?" The data exists in their transactions, but there is no way to see it aggregated over a period they choose.

## Solution

A dedicated Insights page where the user picks a date range (last 7 days, this month, last 3 months, or a custom range) and sees two charts built from their real transaction data:

1. **Spending by Category** — a horizontal bar chart breaking down expenses per category for the selected range.
2. **Income vs Expense trend** — a line chart showing how income and expense evolve across the selected range.

The existing Dashboard "Spending rhythm" card stops being fake: it renders real current-month data from the same source. If a range has no transactions, every chart shows a clear empty state with a call to action instead of an empty screen.

## User Stories

1. As a PocketFlow user, I want an Insights page accessible from the bottom navigation, so that I have one place dedicated to understanding my finances.
2. As a user, I want to see my spending broken down by category for a period I choose, so that I know where my money actually goes.
3. As a user, I want the category breakdown as horizontal bars, so that I can easily compare spending amounts between categories.
4. As a user, I want each bar labeled with its category name and amount, so that I don't have to guess what a bar represents.
5. As a user, I want to see how my income compares to my expenses over time, so that I can tell whether I'm living within my means.
6. As a user, I want the trend chart to automatically pick sensible time buckets (daily/weekly/monthly), so that short ranges stay detailed and long ranges stay readable.
7. As a user, I want to filter reports with presets (last 7 days, this month, last 3 months), so that common questions take one tap to answer.
8. As a user, I want to pick a custom start and end date, so that I can analyze any specific period I care about.
9. As a user, I want the date range to apply to both charts at once, so that I'm always comparing apples to apples.
10. As a user, I want the selected range shown back to me ("1 Jun – 30 Jun 2026"), so that I always know what period I'm looking at.
11. As a user, I want a clear empty state with a suggestion to add transactions when a range has no data, so that I'm never staring at a blank chart.
12. As a user, I want the Dashboard spending-rhythm card to show my actual spending for the current month, so that the quick-look chart reflects reality.
13. As a user, I want the Dashboard card to link me to the full Insights page, so that I can go deeper in one click.
14. As a user, I want charts rendered without page reloads or heavy client-side JavaScript, so that Insights stays fast on mobile.
15. As a user, I want amounts formatted in Rupiah consistently across charts and summaries, so that everything matches the rest of the app.
16. As a user, I want transfers excluded from spending totals, so that moving money between envelopes doesn't inflate my expense numbers.
17. As a user, I want categories with zero spending omitted from the breakdown, so that the chart only shows meaningful rows.
18. As a user, I want the insights endpoint scoped to my own account, so that no other user can ever see my aggregates.
19. As a user, I want invalid or absurd date ranges rejected with a helpful error message, so that I understand why my request failed.
20. As a developer, I want aggregation logic isolated in an API service function, so that it is testable independently of HTTP wiring and UI.

## Implementation Decisions

These decisions were settled interactively with the user; treat them as final unless the user says otherwise.

- **Net worth is deferred to Phase 2.** The net worth acceptance criterion from `docs/FEATURES.md §7` is explicitly out of scope here; `docs/ROADMAP.md` already schedules real net worth behind Plaid account balances. FR-06 is considered complete for MVP without it. The Insights page layout must not preclude re-introducing net worth later (e.g., as a tab).
- **Single API endpoint:** `GET /api/insights/summary?from=&to=` returning `{ byCategory, incomeVsExpense, meta }` inside the standard `success/data/error` envelope from `docs/API.md`. Both charts share one date scope, so one round-trip serves both.
- **Response contract (data payload):**
  - `byCategory`: array of `{ categoryId, categoryName, total, percentage }`, sorted by `total` descending, expense-only, transfers excluded, zero-total categories omitted.
  - `incomeVsExpense`: array of buckets `{ bucketStart, bucketEnd, label, incomeTotal, expenseTotal }`.
  - `meta`: `{ from, to, granularity, currency }` where granularity is `"daily" | "weekly" | "monthly"` and currency is IDR.
- **Validation via Zod schema in `packages/shared`**, reused by API and (potentially) frontend:
  - `from ≤ to`; maximum range span 12 months; both default to the current month when absent.
  - Error responses follow the standard error shape with a descriptive code (e.g., `INVALID_DATE_RANGE`).
- **Auto granularity:** daily buckets when the range ≤ 31 days, weekly when ≤ ~120 days, monthly beyond that. The chosen granularity is returned in `meta.granularity` so the frontend labels axes correctly without duplicating the rule.
- **Business logic lives in a new insights service module under the API service layer**, following the existing pattern of plain functions taking `(db, userId, query)` and throwing `ServiceError` with a `code` and `statusCode`. Route handlers stay thin.
- **User scoping** comes from the same auth middleware used by the existing routes; all aggregation queries filter by `userId`.
- **Charts are pure data-driven SVG — no new dependencies.** No React, no shadcn charts, no Chart.js. The web app remains Astro-only.
- **New `/insights` page** (not tabs): date-range selector at top (presets + custom), then the two charts stacked vertically sharing the range control. Empty state per `docs/USER_FLOW.md §8`: clear CTA, never a blank screen.
- **Dashboard `SpendingRhythm.astro` consumes the same endpoint** for the current month and links to `/insights`; the hard-coded SVG paths are replaced by geometry computed from real data.
- **Chart geometry extracted into a small pure helper module in the web app**: input = API response data, output = SVG-ready values (bar positions/lengths, line path points). Components stay render-only wrappers around that output.
- **No schema changes.** Aggregation reads existing `transactions` (type, amount, date, envelopeId → category) tables only.

## Testing Decisions

- Good tests assert external behavior only: given seeded input data, what does the seam return? No assertions on SQL strings, internal call order, or private helpers.
- **Seam 1 (primary) — insights service function.** Tests exercise the public service function with a stubbed database (same style as the existing `createReadDatabase` stubbing approach) and cover: correct per-category totals and ordering; income vs expense bucket math at each granularity; transfer exclusion; empty-result shape; `ServiceError` codes for invalid ranges (`from > to`, span > 12 months). Schema-level validation tests live next to the Zod schemas in `packages/shared`, mirroring the existing contract-test style.
- **Seam 2 (secondary) — pure chart-geometry helper.** Vitest unit tests mapping a known API response to expected SVG values (bar count/order/lengths, line path point count, empty-data produces an empty-state signal rather than degenerate SVG). Prior art: the existing web lib test for achievement icons.
- Prior art for both seams already exists in-repo; no new test infrastructure is needed. Astro components themselves remain untested render shells.

## Out of Scope

- **Net worth over time** — deferred to Phase 2 pending Plaid-based account balances (per `docs/ROADMAP.md`). No manual account CRUD will be built for this feature.
- Manual bank/account management of any kind.
- Financial Health Score changes — it stays where it is today with its simple formula; touching it is not required for FR-06.
- Chart interactivity such as hover tooltips or animations — can be added later on top of the SVG output if wanted.
- Export/download of reports (CSV/PDF).
- Any change to the transaction list endpoint or its filters.
- New database tables or migrations.

## Further Notes

- This spec encodes two deliberate divergences worth reflecting in docs during implementation: (1) FR-06's net worth acceptance criterion moves to Phase 2 (already reflected in ROADMAP's Phase 2 Plaid item — consider annotating `docs/REQUIREMENTS.md FR-06` accordingly); (2) the Insights page uses stacked sections instead of the tabs sketched in `docs/USER_FLOW.md §6` — update that wireframe when the feature lands.
- Granularity thresholds (31 / ~120 days) are initial values chosen for readability; they are exposed via `meta.granularity` precisely so they can be tuned without changing consumers.
- Currency formatting should reuse whatever IDR formatting utility the frontend already uses for consistency.
