# 🧪 Manual Testing Guide - Bugfix Verification

**Date:** 2026-08-22  
**Purpose:** Verify all 4 critical bugfixes work correctly  
**Estimated Time:** 15 minutes

---

## 🔧 Prerequisites

**Ensure services are running:**
```bash
# Terminal 1 - Backend
cd D:/Project/WEBSITE/Pocketflow/pocketflow/apps/api
pnpm dev

# Terminal 2 - Frontend
cd D:/Project/WEBSITE/Pocketflow/pocketflow/apps/web
pnpm dev

# URLs:
# Backend: http://localhost:8787
# Frontend: http://localhost:4321
```

**Browser:** Open http://localhost:4321  
**DevTools:** Open F12 → Network tab (to monitor API calls)

---

## ✅ Test Case 1: Income Cannot Be Assigned to Envelope (Bug #1)

**Purpose:** Verify income transactions block envelope selection

### Steps:
1. Login to the app
2. Click **"+ Add"** button (top right of Transactions panel)
3. Select **"Income"** type

### Expected Results:
- ✅ Envelope selector field should be **HIDDEN**
- ✅ Green info box appears with message:
  > 💰 Income Info: Income will be added to your "Available to Spend" pool. Use the "Fill Envelope" feature to allocate funds to specific envelopes.

### What to Check:
- [ ] Envelope dropdown is NOT visible when Income is selected
- [ ] Info box is visible with green background (#E8F7F0)
- [ ] Switching to "Expense" → Envelope dropdown appears
- [ ] Switching back to "Income" → Envelope dropdown hidden again

**Status:** ⬜ Not Tested | ✅ Passed | ❌ Failed

**Notes:**
```
[Write any observations here]
```

---

## ✅ Test Case 2: Available to Spend Updates After Income (Bug #3)

**Purpose:** Verify "Available to Spend" pool increases when income is added

### Setup:
1. Note current "Available to Spend" value (dashboard, top card)
2. Current value: **Rp _____________**

### Steps:
1. Click **"+ Add"** button
2. Select **"Income"** type
3. Amount: **Rp 1.000.000**
4. Description: **"Test Income"**
5. Date: Today
6. Receipt: (leave empty)
7. Click **"Create"**

### Expected Results:
- ✅ Transaction created successfully
- ✅ "Available to Spend" increases by **Rp 1.000.000**
- ✅ "Monthly Income" increases by **Rp 1.000.000**
- ✅ Dashboard refreshes automatically

### What to Check:
- [ ] Available to Spend = Previous + 1.000.000
- [ ] Monthly Income updated
- [ ] Transaction appears in recent transactions list
- [ ] No envelope assigned to the transaction

**Before Available to Spend:** Rp _____________  
**After Available to Spend:** Rp _____________  
**Difference:** Rp _____________

**Status:** ⬜ Not Tested | ✅ Passed | ❌ Failed

**Notes:**
```
[Write any observations here]
```

---

## ✅ Test Case 3: Fill Envelope Doesn't Trigger Over-Budget (Bug #4)

**Purpose:** Verify filling envelope doesn't show over-budget status

### Setup:
1. Create a new envelope:
   - Name: **"Test Groceries"**
   - Budget: **Rp 200.000**
   - Category: Any
2. Note: currentAmount should be **Rp 0**

### Steps:
1. Go to **Envelope Manager** (or find envelope on dashboard)
2. Click **"Fill Envelope"** for "Test Groceries"
3. Amount: **Rp 100.000**
4. Click **"Fill"**

### Expected Results:
- ✅ Current amount becomes **Rp 100.000**
- ✅ Progress bar shows **0% used** (or very low %)
- ✅ Envelope status: **🟢 GREEN** (NOT over-budget)
- ✅ Available to Spend decreases by **Rp 100.000**

### Visual Checks:
- [ ] Border color: Green/Gray (NOT red #F5C1B1)
- [ ] Progress bar color: Green #56B994 (NOT red #EF4444)
- [ ] NO "Over budget" badge visible
- [ ] Status indicator (dot): Green #58BB91 (NOT red #EF4444)

### Fill Again (to 100% of budget):
1. Click **"Fill Envelope"** again
2. Amount: **Rp 100.000** (total will be 200k = 100% of budget)
3. Click **"Fill"**

### Expected Results After Second Fill:
- ✅ Current amount: **Rp 200.000**
- ✅ Progress bar: Still **0% used** (no spending yet!)
- ✅ Status: Still **🟢 GREEN** (NOT over-budget)

**Status:** ⬜ Not Tested | ✅ Passed | ❌ Failed

**Notes:**
```
[Write any observations here]
```

---

## ✅ Test Case 4: Over-Budget Based on Spending (Bug #2 & #4)

**Purpose:** Verify over-budget status triggers only when spending exceeds budget

### Setup:
Use the same envelope from Test Case 3:
- Name: "Test Groceries"
- Budget: **Rp 200.000**
- Current Amount: **Rp 200.000** (after fills)
- Total Spent: **Rp 0** (no expenses yet)

### Steps - Part A: Spending Within Budget
1. Click **"+ Add"** transaction
2. Select **"Expense"** type
3. Amount: **Rp 50.000**
4. Description: **"Test Expense 1"**
5. Envelope: **"Test Groceries"**
6. Click **"Create"**

### Expected Results Part A:
- ✅ Current amount: **Rp 150.000** (200k - 50k)
- ✅ Total spent: **Rp 50.000**
- ✅ Progress bar: **25% used** (50k / 200k budget)
- ✅ Status: **🟢 GREEN** (under budget)

**Visual Checks:**
- [ ] Progress bar shows approximately 25%
- [ ] Progress bar color: Green
- [ ] NO "Over budget" badge
- [ ] Text shows: "25% used"

### Steps - Part B: Spending Over Budget
1. Click **"+ Add"** transaction
2. Select **"Expense"** type
3. Amount: **Rp 180.000**
4. Description: **"Test Expense 2 - Over Budget"**
5. Envelope: **"Test Groceries"**
6. Click **"Create"**

### Expected Results Part B:
- ✅ Current amount: **-Rp 30.000** (150k - 180k, allows negative)
- ✅ Total spent: **Rp 230.000** (50k + 180k)
- ✅ Progress bar: **100%** (capped, showing red)
- ✅ Status: **🔴 RED** (over-budget!)
- ✅ "Over budget" badge visible

**Visual Checks:**
- [ ] Border color: Red #F5C1B1
- [ ] Progress bar color: Red #EF4444
- [ ] Progress bar width: 100% (full)
- [ ] "Over budget" badge appears (red background)
- [ ] Status indicator dot: Red #EF4444
- [ ] Current amount shows in red color
- [ ] Text shows: "Over budget" (not percentage)

**Status:** ⬜ Not Tested | ✅ Passed | ❌ Failed

**Notes:**
```
[Write any observations here]
```

---

## ✅ Test Case 5: Income + Envelope Validation (API Level)

**Purpose:** Verify API rejects income with envelope (defense in depth)

### Setup:
Open Browser DevTools → Console tab

### Steps:
Paste and run this JavaScript in the console:

```javascript
// Get auth token
const token = localStorage.getItem('authToken');

// Try to create income with envelope (should fail)
fetch('http://localhost:8787/api/transactions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    type: 'income',
    amount: 100000,
    description: 'Test Invalid Income',
    date: new Date().toISOString(),
    envelopeId: 'any-envelope-id-here'
  })
})
.then(r => r.json())
.then(data => console.log('Response:', data));
```

### Expected Results:
```json
{
  "success": false,
  "error": {
    "code": "INVALID_INPUT",
    "message": "Income transactions cannot be assigned to an envelope. Use Fill Envelope feature instead."
  }
}
```

**What to Check:**
- [ ] Response status: 400 Bad Request
- [ ] Error code: "INVALID_INPUT"
- [ ] Error message mentions Fill Envelope feature
- [ ] Transaction NOT created in database

**Status:** ⬜ Not Tested | ✅ Passed | ❌ Failed

**Notes:**
```
[Write any observations here]
```

---

## 📊 Test Summary

| Test Case | Status | Notes |
|-----------|--------|-------|
| 1. Income envelope hidden | ⬜ | |
| 2. Available to Spend updates | ⬜ | |
| 3. Fill doesn't trigger over-budget | ⬜ | |
| 4. Over-budget based on spending | ⬜ | |
| 5. API validation | ⬜ | |

**Overall Status:** ⬜ Not Started | 🟡 In Progress | ✅ All Passed | ❌ Failed

---

## 🐛 Issues Found

If you find any issues during testing, document here:

### Issue 1:
**Test Case:** [Number]  
**Expected:** [What should happen]  
**Actual:** [What actually happened]  
**Screenshot/Video:** [Optional]

### Issue 2:
**Test Case:** [Number]  
**Expected:** [What should happen]  
**Actual:** [What actually happened]  
**Screenshot/Video:** [Optional]

---

## 📸 Screenshots Checklist

Take screenshots for evidence:
- [ ] Income form with hidden envelope selector
- [ ] Green info box for income
- [ ] Available to Spend before/after income
- [ ] Envelope filled to 100% budget (still green)
- [ ] Envelope over-budget (red with badge)
- [ ] API error response in console

---

## ✅ Sign-Off

**Tested By:** _______________________  
**Date:** _______________________  
**Result:** ⬜ Passed | ⬜ Failed | ⬜ Needs Fixes  
**Comments:**
```
[Any additional observations or recommendations]
```

---

## 🔄 Cleanup (After Testing)

To reset test data:
```sql
-- Delete test transactions
DELETE FROM transactions WHERE description LIKE 'Test%';

-- Delete test envelope
DELETE FROM envelopes WHERE name = 'Test Groceries';
```

Or just continue using the test data for further development.
