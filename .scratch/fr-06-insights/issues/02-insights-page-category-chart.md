# 02: Insights page — scaffold, date range selector, Spending by Category chart

**What to build:** The Insights page reachable from the bottom navigation. A date range control at the top (presets: last 7 days, this month, last 3 months; plus custom start/end dates) drives the charts below. This ticket delivers the first of them: a horizontal bar chart breaking down spending by category for the selected range, rendered as data-driven SVG with no new dependencies. When the selected range has no transactions, a clear empty state with a call to action is shown instead of a blank chart. Bar geometry is computed by a small pure helper module so it can be unit-tested.

**Blocked by:** 01 (Insights summary API endpoint)

**Status:** ready-for-agent

- [ ] `/insights` page registered in bottom navigation per the existing nav structure
- [ ] Range presets and a custom date picker update both the visible range label and the fetched data
- [ ] Horizontal bar chart renders category name, amount, and relative length per category from the API response, sorted descending
- [ ] Amounts formatted consistently in Rupiah like the rest of the app
- [ ] Empty state with clear CTA when no data exists for the range, per the cross-flow UX principle
- [ ] Chart geometry extracted into a pure helper (input: API data; output: SVG-ready values)
- [ ] Helper unit tests cover bar count/order/lengths and the empty-data signal — in the style of existing web lib tests
- [ ] No new runtime dependencies added to the web app
