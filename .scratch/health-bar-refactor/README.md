# Health Bar Refactor - Ticket Breakdown

**Created:** 2026-08-22  
**Status:** Ready for Implementation  
**Location:** `.scratch/health-bar-refactor/issues/`

---

## 📋 Overview

The health bar refactor has been broken down into **6 vertical slice tickets**, each representing a complete path through all layers (backend, frontend, tests).

---

## 🎫 Tickets

### **01 - Health Bar Calculation Foundation**
- **Blocked by:** None (can start immediately)
- **What it delivers:** Tested utility function in shared package that calculates health status, percentage, colors, and badge data
- **Estimated time:** 45-60 minutes
- **File:** [`01-health-bar-calculation-foundation.md`](./.scratch/health-bar-refactor/issues/01-health-bar-calculation-foundation.md)

### **02 - Backend Health Data Pipeline**
- **Blocked by:** Ticket 01
- **What it delivers:** Backend API returns `totalSpent` field, `isOverBudget` logic updated, dashboard endpoint refactored
- **Estimated time:** 60-90 minutes
- **File:** [`02-backend-health-data-pipeline.md`](./.scratch/health-bar-refactor/issues/02-backend-health-data-pipeline.md)

### **03 - Health Bar UI Component**
- **Blocked by:** Ticket 01
- **What it delivers:** Reusable `EnvelopeProgress.astro` component with animations, tooltips, badges, and compact/detailed variants
- **Estimated time:** 60-90 minutes
- **File:** [`03-health-bar-ui-component.md`](./.scratch/health-bar-refactor/issues/03-health-bar-ui-component.md)

### **04 - Integrate Health Bar in Manage Envelopes**
- **Blocked by:** Tickets 02, 03
- **What it delivers:** Manage Envelopes page uses new health bar component with detailed view, bug fixed, live updates working
- **Estimated time:** 30-45 minutes
- **File:** [`04-integrate-health-bar-manage-envelopes.md`](./.scratch/health-bar-refactor/issues/04-integrate-health-bar-manage-envelopes.md)

### **05 - Integrate Health Bar in Dashboard**
- **Blocked by:** Tickets 02, 03
- **What it delivers:** Dashboard uses new health bar component in compact mode, consistent with Manage Envelopes
- **Estimated time:** 30-45 minutes
- **File:** [`05-integrate-health-bar-dashboard.md`](./.scratch/health-bar-refactor/issues/05-integrate-health-bar-dashboard.md)

### **06 - Manual Testing & Documentation**
- **Blocked by:** Tickets 04, 05
- **What it delivers:** All 10 manual test scenarios verified, all 5 contract docs updated with new terminology
- **Estimated time:** 60-90 minutes
- **File:** [`06-manual-testing-documentation.md`](./.scratch/health-bar-refactor/issues/06-manual-testing-documentation.md)

---

## 📊 Dependency Graph

```
01 (Foundation)
 ├─→ 02 (Backend)
 │    ├─→ 04 (Manage Envelopes)
 │    │    └─→ 06 (Testing & Docs)
 │    └─→ 05 (Dashboard)
 │         └─→ 06 (Testing & Docs)
 └─→ 03 (UI Component)
      ├─→ 04 (Manage Envelopes)
      └─→ 05 (Dashboard)
```

---

## 🚀 Execution Strategy

### **Sequential (Safe)**
Work tickets in numerical order: 01 → 02 → 03 → 04 → 05 → 06

**Total time:** ~5-6 hours

### **Parallel (Faster)**
1. Complete **Ticket 01** first (foundation)
2. Work **Tickets 02 & 03** in parallel (backend + frontend)
3. Work **Tickets 04 & 05** in parallel (integrations)
4. Complete **Ticket 06** last (verification)

**Total time:** ~3-4 hours (with parallelization)

---

## ✅ Starting Point

**First ticket to implement:** `01-health-bar-calculation-foundation.md`

This ticket has no blockers and establishes the foundation for all other work.

---

## 📁 File Structure

```
.scratch/health-bar-refactor/
└── issues/
    ├── 01-health-bar-calculation-foundation.md
    ├── 02-backend-health-data-pipeline.md
    ├── 03-health-bar-ui-component.md
    ├── 04-integrate-health-bar-manage-envelopes.md
    ├── 05-integrate-health-bar-dashboard.md
    └── 06-manual-testing-documentation.md
```

---

## 🔗 Related Documentation

- **Full Spec:** [`progress/FR-04/health-bar-refactor-spec.md`](./progress/FR-04/health-bar-refactor-spec.md)
- **Implementation Guide:** [`progress/FR-04/README.md`](./progress/FR-04/README.md)
- **Requirements:** [`docs/REQUIREMENTS.md`](./docs/REQUIREMENTS.md)

---

## 📝 Notes

- Each ticket is sized to fit in a single context window
- All tickets follow the vertical slice principle (complete end-to-end behavior)
- Blocking relationships ensure safe incremental progress
- Each ticket includes detailed acceptance criteria and implementation notes

---

**Ready to start implementation!**

To begin, work on ticket 01:
```
.scratch/health-bar-refactor/issues/01-health-bar-calculation-foundation.md
```
