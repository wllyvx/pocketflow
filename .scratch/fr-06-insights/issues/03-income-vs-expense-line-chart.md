# 03: Income vs Expense trend line chart on Insights

**What to build:** The second chart on the Insights page: a line trend showing income versus expense across the selected range, sharing the date range control with the category chart. Bucket labels on the axis follow the granularity reported by the API (daily/weekly/monthly), so short ranges stay detailed and long ranges stay readable. Rendered as data-driven SVG via the same pure-helper approach; empty ranges fall back to the same empty state pattern.

**Blocked by:** 02 (Insights page — scaffold, date range selector, Spending by Category chart)

**Status:** done

- [x] Line chart renders income and expense series from the API's trend buckets below the category chart
- [x] Axis/bucket labels derive from `meta.granularity`, not from frontend assumptions
- [x] Both charts always reflect the same selected range
- [x] Empty state reuses the established pattern when the range has no data
- [x] Line-path geometry computed in the pure helper module (input: buckets; output: path points)
- [x] Helper unit tests cover point count per bucket count and empty-data handling
