# 04: Dashboard Spending Rhythm card uses real data

**What to build:** The "Spending rhythm" card on the Dashboard stops being a static mock: its line is computed from the user's actual expense data for the current month, fetched from the same insights endpoint built in ticket 01, and the card links through to the full Insights page. The hand-coded SVG paths are replaced by geometry derived from real data using the same pure-helper approach.

**Blocked by:** 01 (Insights summary API endpoint) — independent of tickets 02 and 03

**Status:** done

- [x] Card fetches current-month insights data and renders the spending line from it
- [x] The displayed monthly total reflects real transaction sums (replacing the hard-coded placeholder value)
- [x] Card links to the Insights page
- [x] Line geometry comes from the shared pure helper; no hand-authored path data remains
- [x] Graceful empty state when the current month has no expenses yet
