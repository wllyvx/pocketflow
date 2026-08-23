# 05: Finalization — docs sync and end-to-end verification

**What to build:** Close out FR-06: the documentation reflects the decisions that diverged from the original specs, the roadmap checkbox for Insights is ticked, and the whole feature passes lint, typecheck, build, and a manual end-to-end pass (new user with no data → empty states; user with transactions across months → charts correct under each preset and a custom range).

**Blocked by:** 02, 03, 04

**Status:** ready-for-agent

- [ ] USER_FLOW insights section updated: tabs sketch replaced by the stacked-sections layout actually built
- [ ] REQUIREMENTS FR-06 annotated: net worth acceptance criterion deferred to Phase 2 (per roadmap's Plaid item)
- [ ] Roadmap Phase 1d Insights checklist item marked complete
- [ ] Lint, typecheck, and Astro build all pass
- [ ] Manual verification: presets and custom range drive both charts; empty states show CTAs; dashboard card shows real current-month data
- [ ] Parent spec issue moved to closed once everything above is green
