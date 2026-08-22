# Bugfix: Income & Over-Budget Logic

**Date:** 2026-08-22  
**Status:** ✅ Completed

## Masalah yang Ditemukan

### 1. Income Langsung Masuk ke Amplop (Bug Kritis)
**Symptom:**
- User input income dengan memilih amplop → `currentAmount` amplop langsung bertambah
- Income terhitung sebagai spending sehingga amplop menjadi over-budget (merah)
- Fitur "Fill Envelope" menjadi redundant karena income sudah bisa langsung ke amplop

**Root Cause:**
- `transaction.service.ts` baris 192-214 memiliki logic yang **salah secara konseptual**
- Income dengan `envelopeId` langsung menambah `envelope.currentAmount`
- Ini **bypass** mekanisme "Available to Spend" pool

**Expected Behavior:**
- Income **TIDAK BOLEH** langsung masuk ke amplop
- Income hanya menambah pool "Available to Spend"
- User harus pakai fitur **"Fill Envelope"** untuk alokasi manual

### 2. Over-Budget Logic Salah
**Symptom:**
- Amplop dengan saldo tinggi malah ditandai over-budget (merah)
- Amplop dengan spending rendah tapi saldo besar → status merah ❌

**Root Cause:**
- `envelope.service.ts` baris 96 menggunakan formula salah:
  ```typescript
  isOverBudget: row.envelope.currentAmount < 0 || 
                row.envelope.currentAmount > row.envelope.budgetedAmount
  ```
- Logic ini salah karena membandingkan **saldo** dengan **budget**
- Seharusnya membandingkan **total spending** dengan **budget**

**Expected Behavior:**
```typescript
isOverBudget: totalSpent > budgetedAmount
```

### 3. Available to Spend Calculation
**Current Logic (Correct):**
```typescript
Available to Spend = Total Income - Sum(envelope.currentAmount)
```
✅ Logic ini **sudah benar**, tidak perlu diubah.

---

## Solusi yang Diterapkan

### Fix 1: Block Income Assignment to Envelope

**File:** `packages/shared/src/index.ts`

Tambahkan validasi di `createTransactionSchema`:
```typescript
if (input.type === "income" && input.envelopeId) {
  ctx.addIssue({
    code: z.ZodIssueCode.custom,
    path: ["envelopeId"],
    message: "Income transactions cannot be assigned to an envelope. Use Fill Envelope feature instead.",
  });
}
```

**File:** `apps/api/src/services/transaction.service.ts`

Ganti baris 192-214 dengan:
```typescript
} else if (input.type === "income") {
  // Income transactions should NOT directly modify envelope balance
  // They only contribute to "Available to Spend" pool
  // Users must use "Fill Envelope" feature to allocate income to envelopes
  if (input.envelopeId) {
    throw new ServiceError(
      "INVALID_INPUT",
      "Income transactions cannot be assigned to an envelope. Use Fill Envelope feature instead.",
      400
    );
  }
} else if (input.type === "transfer") {
```

### Fix 2: Correct Over-Budget Logic

**File:** `apps/api/src/services/envelope.service.ts`

Ganti baris 96 dengan:
```typescript
isOverBudget: Number(summary?.totalSpent ?? 0) > row.envelope.budgetedAmount,
```

### Fix 3: Update API Documentation

**File:** `docs/API.md`

Update dokumentasi `POST /transactions`:
- Tambahkan penjelasan bahwa **income TIDAK BOLEH** memiliki `envelopeId`
- Jelaskan bahwa user harus pakai `POST /envelopes/:id/fill` untuk alokasi
- Tambahkan error code `INVALID_INPUT` untuk kasus ini

---

## Verification

### Build & Type Check
```bash
pnpm typecheck  ✅ PASS
pnpm build      ✅ PASS
```

### Behavioral Changes

**Sebelum Fix:**
1. User input income Rp 1.000.000 → pilih amplop "Groceries"
   - `currentAmount` amplop langsung +1.000.000 ✅
   - `totalSpent` juga +1.000.000 ❌ (SALAH!)
   - Status amplop: MERAH (over-budget) ❌

**Setelah Fix:**
1. User input income Rp 1.000.000 → **TIDAK BISA** pilih amplop
   - Error: `Income transactions cannot be assigned to an envelope`
   - Income hanya menambah "Available to Spend" ✅
2. User pakai "Fill Envelope" Rp 500.000 ke "Groceries"
   - `currentAmount` amplop +500.000 ✅
   - `totalSpent` tetap 0 ✅
   - Status amplop: HIJAU (not over-budget) ✅
3. User input expense Rp 200.000 dari "Groceries"
   - `currentAmount` amplop menjadi 300.000 ✅
   - `totalSpent` menjadi 200.000 ✅
   - Status: tetap HIJAU (spending < budget) ✅

---

## Impact Analysis

### Breaking Changes
⚠️ **Frontend Form Perlu Update:**
- Form "Add Income" harus **HIDE** atau **DISABLE** field envelope selector
- UI harus menampilkan pesan: "Income will be added to Available to Spend pool"

### Database Migration
✅ **TIDAK PERLU** migration, hanya logic layer yang berubah.

### User Flow Changes
**Old Flow (Wrong):**
```
Income → Select Envelope → Done ❌
```

**New Flow (Correct):**
```
Income → (No envelope selection) → Available to Spend pool
Then: Fill Envelope → Select Envelope → Transfer from pool ✅
```

---

## Testing Checklist

- [x] Type check berhasil
- [x] Build berhasil
- [ ] Manual test: Create income tanpa amplop → berhasil
- [ ] Manual test: Create income dengan amplop → error 400
- [ ] Manual test: Fill envelope → currentAmount bertambah
- [ ] Manual test: Expense dari amplop → totalSpent bertambah
- [ ] Manual test: Over-budget status berdasarkan totalSpent
- [ ] Frontend: Hide envelope selector pada income form

---

## Next Steps

1. **Update Frontend Form** (High Priority)
   - File: `apps/web/src/components/transaction-form.tsx` atau sejenisnya
   - Hide/disable envelope selector when `type === "income"`
   
2. **Data Cleanup** (Optional)
   - Cek apakah ada transaksi income lama dengan `envelopeId` di database
   - Jika ada, pertimbangkan data migration untuk cleanup

3. **Unit Tests** (Recommended)
   - Test: income dengan envelopeId → throw error
   - Test: income tanpa envelopeId → success
   - Test: isOverBudget based on totalSpent

---

## References

- `docs/REQUIREMENTS.md` - FR-03 specification
- `progress/FR-03/follow-up.md` - FR-03 implementation tasks
- `docs/API.md` - Updated API documentation
