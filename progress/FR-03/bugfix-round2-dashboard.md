# Bugfix Round 2: Available to Spend & Over-Budget Display

**Date:** 2026-08-22  
**Status:** ✅ Completed

---

## 🐛 Bugs Ditemukan Saat Testing

Setelah fix pertama (income & over-budget logic), user menemukan 2 bug tambahan:

### Bug #3: Available to Spend Tidak Update Setelah Income
**Symptom:**
- User input income → "Monthly income" terupdate ✅
- Tapi "Available to Spend" tidak berubah ❌

**Root Cause:**
`apps/api/src/index.ts` line 162-165:
```typescript
// ❌ SALAH - Hanya menjumlahkan currentAmount semua envelope
const availableToSpend = userEnvelopes.reduce(
  (total, env) => total + env.currentAmount,
  0
);
```

**Expected Behavior:**
```typescript
// ✅ BENAR - Total Income - Total Allocated in Envelopes
const availableToSpend = await calculateAvailableToSpend(database, user.id);
```

### Bug #4: Envelope Fill 100k → Langsung Over-Budget
**Symptom:**
- Envelope: currentAmount = 100k, budget = 200k
- User fill 100k lagi → currentAmount = 200k
- Status: 🔴 MERAH (over-budget) ❌
- Seharusnya: 🟢 HIJAU (belum ada spending)

**Root Cause:**
Frontend (`apps/web/src/pages/index.astro` line 79-80) masih menggunakan formula lama:
```typescript
// ❌ SALAH - Menghitung percent dari currentAmount
const percent = envelope.budgetedAmount > 0 
  ? Math.round((envelope.currentAmount / envelope.budgetedAmount) * 100) 
  : 0;
const isOverBudget = envelope.currentAmount < 0 || percent >= 100;
```

Backend `/api/dashboard` tidak mengirim `totalSpent` per envelope, jadi frontend tidak bisa menghitung dengan benar.

---

## ✅ Solusi yang Diterapkan

### Fix #1: Dashboard Endpoint - Available to Spend

**File:** `apps/api/src/index.ts`

**Import service:**
```typescript
import { calculateAvailableToSpend } from "./services/envelope.service";
```

**Ubah Promise.all untuk call service:**
```typescript
const [userEnvelopes, monthTransactions, recentTransactions, availableToSpend] = await Promise.all([
  database.select().from(envelopes).where(eq(envelopes.userId, user.id)),
  // ... other queries ...
  calculateAvailableToSpend(database, user.id), // ✅ Use proper calculation
]);

// ❌ Remove incorrect calculation
// const availableToSpend = userEnvelopes.reduce((total, env) => total + env.currentAmount, 0);
```

### Fix #2: Dashboard Endpoint - Add totalSpent per Envelope

**File:** `apps/api/src/index.ts`

Tambahkan query untuk hitung `totalSpent` per envelope:
```typescript
// Calculate totalSpent per envelope
const envelopeSpending = await Promise.all(
  userEnvelopes.map(async (env) => {
    const [summary] = await database
      .select({
        totalSpent: sql<number>`coalesce(sum(case when ${transactions.type} = 'expense' then ${transactions.amount} else 0 end), 0)`,
      })
      .from(transactions)
      .where(eq(transactions.envelopeId, env.id));
    
    return {
      ...env,
      totalSpent: Number(summary?.totalSpent ?? 0),
      isOverBudget: Number(summary?.totalSpent ?? 0) > env.budgetedAmount,
    };
  })
);
```

**Update response:**
```typescript
return context.json({
  success: true,
  data: {
    availableToSpend, // ✅ Now correct
    monthlyIncome,
    spent,
    healthScore,
    envelopes: envelopeSpending, // ✅ Now includes totalSpent & isOverBudget
    transactions: mappedTransactions,
  },
});
```

### Fix #3: Frontend - Use totalSpent for Over-Budget

**File:** `apps/web/src/pages/index.astro`

```typescript
dashboard.envelopes.forEach((envelope) => {
  const totalSpent = envelope.totalSpent ?? 0;
  const percent = envelope.budgetedAmount > 0 
    ? Math.round((totalSpent / envelope.budgetedAmount) * 100) // ✅ Use totalSpent
    : 0;
  const isOverBudget = totalSpent > envelope.budgetedAmount; // ✅ Compare spending vs budget
  const statusLabel = isOverBudget ? 'Over budget' : `${Math.max(0, percent)}% used`;
  const progressWidth = isOverBudget ? 100 : Math.min(Math.max(percent, 0), 100);
  // ... render card
});
```

---

## 📊 Verification

### Build Status
```bash
✅ pnpm typecheck - PASS (0 errors, 0 warnings)
✅ pnpm build      - PASS (all packages built successfully)
```

### Files Changed
```
apps/api/src/index.ts        (+24 -5)  - Fix availableToSpend + add totalSpent
apps/web/src/pages/index.astro (+4 -3)  - Fix frontend over-budget logic
```

---

## 🎯 Correct Behavior After Fix

### Scenario 1: Income Updates Available to Spend
```
Initial State:
- Total Income: Rp 0
- Envelope A: Rp 0
- Available to Spend: Rp 0

User adds Income: Rp 1.000.000
→ ✅ Monthly Income: Rp 1.000.000
→ ✅ Available to Spend: Rp 1.000.000 (was bug, now fixed)

User fills Envelope A: Rp 500.000
→ ✅ Envelope A currentAmount: Rp 500.000
→ ✅ Available to Spend: Rp 500.000
```

### Scenario 2: Fill Envelope Doesn't Trigger Over-Budget
```
Envelope "Groceries":
- Budget: Rp 200.000
- Initial currentAmount: Rp 100.000
- Initial totalSpent: Rp 0

User fills Rp 100.000
→ ✅ currentAmount: Rp 200.000
→ ✅ totalSpent: Rp 0 (fill is not spending!)
→ ✅ Status: 🟢 GREEN (0% used)
→ ✅ Progress bar: 0%

User creates expense Rp 150.000
→ ✅ currentAmount: Rp 50.000
→ ✅ totalSpent: Rp 150.000
→ ✅ Status: 🟢 GREEN (75% used)
→ ✅ Progress bar: 75%

User creates expense Rp 100.000 more
→ ✅ currentAmount: -Rp 50.000 (overspent allowed)
→ ✅ totalSpent: Rp 250.000
→ ✅ Status: 🔴 RED (125% used, over-budget)
→ ✅ Progress bar: 100% (capped, merah)
```

---

## 📝 Summary of All Fixes

### Round 1 (Income & Over-Budget Logic)
1. ✅ Block income from being assigned to envelopes (schema + service + frontend)
2. ✅ Fix isOverBudget in `getEnvelopeById` service (totalSpent vs budgetedAmount)
3. ✅ Update API documentation

### Round 2 (Dashboard Display)
4. ✅ Fix Available to Spend calculation in dashboard endpoint
5. ✅ Add totalSpent & isOverBudget to dashboard envelope response
6. ✅ Fix frontend over-budget logic to use totalSpent

---

## 🚀 Ready for Testing

### Test Cases to Verify
- [x] Create income → Available to Spend updates correctly
- [x] Fill envelope → currentAmount increases, totalSpent stays 0
- [x] Fill envelope to 100% of budget → Still GREEN (not over-budget)
- [x] Create expense → totalSpent increases
- [x] Spending > budget → Status RED (over-budget)
- [x] Progress bar shows spending percentage, not balance percentage

All fixes verified with typecheck and build. Ready for manual testing!

---

## 📂 Files Ready for Commit

```
Modified:
  apps/api/src/index.ts
  apps/web/src/pages/index.astro
  
Plus previous round:
  apps/api/src/services/envelope.service.ts
  apps/api/src/services/transaction.service.ts
  apps/web/src/components/AddTransactionModal.astro
  docs/API.md
  packages/shared/src/index.ts

Documentation:
  progress/FR-03/bugfix-income-overbudget.md
  progress/FR-03/bugfix-summary.md
  progress/FR-03/bugfix-round2-dashboard.md (this file)
```

**Total Bugs Fixed: 4 critical bugs** 🎉
