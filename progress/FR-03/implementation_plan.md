# Implementation Plan: Kontrak & Backend FR-03 (Envelope Budgeting System)

Dokumen spesifikasi teknis dan rencana implementasi final untuk fitur **FR-03: Envelope Budgeting System** pada PocketFlow berdasarkan keputusan desain user.

---

## Keputusan Desain yang Dikonfirmasi User

1. **Kalkulasi "Available to Spend":**
   - Dihitung secara dinamis:
     $$\text{Available to Spend} = \text{Total Income} - \sum \text{currentAmount (Envelopes)}$$
   - Memastikan pengguna tidak dapat mengisi envelope melebihi sisa dana yang tersedia.

2. **Pencatatan Riwayat "Fill Envelope":**
   - Setiap operasi pengisian envelope dari "Available to Spend" akan membuat baris entri di tabel `transactions`:
     - `type`: `"transfer"` (atau income allocation ke envelope)
     - `amount`: jumlah yang diisikan
     - `envelopeId`: `destinationEnvelopeId` (atau `envelopeId` yang dituju)
     - `description`: `"Fill Envelope: [Nama Envelope]"`
     - `isManual`: `true`

3. **Perilaku Penghapusan Transaksi saat Envelope Dihapus:**
   - Ketika envelope dihapus, seluruh transaksi yang terhubung dengan envelope tersebut (`envelopeId` atau `destinationEnvelopeId`) akan **dihapus dari database**.
   - Sisa saldo envelope (jika ada):
     - Jika `transferToEnvelopeId` diberikan: sisa saldo ditransfer ke envelope tujuan.
    - Untuk saldo non-zero, client wajib memilih salah satu: `transferToEnvelopeId` atau `returnToAvailableToSpend: true`.
    - Jika dikembalikan ke Available to Spend: envelope dihapus, transaksi terkait terhapus, dan saldo otomatis kembali ke perhitungan "Available to Spend".
   - API menyediakan endpoint/informasi peringatan terkait jumlah transaksi yang akan terhapus jika klien meminta konfirmasi sebelum eksekusi delete.

---

## Spesifikasi Kontrak & Komponen

### 1. Shared Package (`packages/shared/src/index.ts`)

#### Zod Schemas & Types:
- `envelopeResetFrequencySchema`: `z.enum(["monthly", "weekly", "once"])`
- `createEnvelopeSchema`:
  ```typescript
  z.object({
    name: z.string().trim().min(1, "Name is required").max(80, "Name must not exceed 80 characters"),
    categoryId: z.string().trim().min(1, "Category ID is required"),
    budgetedAmount: z.number({ invalid_type_error: "Budgeted amount must be a number" }).nonnegative("Budgeted amount cannot be negative"),
    resetFrequency: envelopeResetFrequencySchema.default("monthly"),
  })
  ```
- `updateEnvelopeSchema`:
  ```typescript
  z.object({
    name: z.string().trim().min(1).max(80).optional(),
    categoryId: z.string().trim().min(1).optional(),
    budgetedAmount: z.number().nonnegative().optional(),
    resetFrequency: envelopeResetFrequencySchema.optional(),
  })
  ```
- `fillEnvelopeSchema`:
  ```typescript
  z.object({
    amount: z.number({ invalid_type_error: "Amount must be a number" }).positive("Fill amount must be greater than 0"),
  })
  ```
- `transferEnvelopeSchema`:
  ```typescript
  z.object({
    fromEnvelopeId: z.string().trim().min(1, "Source envelope ID is required"),
    toEnvelopeId: z.string().trim().min(1, "Destination envelope ID is required"),
    amount: z.number({ invalid_type_error: "Amount must be a number" }).positive("Transfer amount must be greater than 0"),
  }).superRefine((data, ctx) => {
    if (data.fromEnvelopeId === data.toEnvelopeId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["toEnvelopeId"],
        message: "Source and destination envelopes must be different",
      });
    }
  })
  ```
- `deleteEnvelopeSchema`:
  ```typescript
  z.object({
    transferToEnvelopeId: z.string().trim().min(1).optional(),
    returnToAvailableToSpend: z.boolean().default(false),
  })
  ```
- Interface `EnvelopeItem`:
  ```typescript
  export interface EnvelopeItem {
    id: string;
    userId: string;
    categoryId: string;
    categoryName?: string | null;
    name: string;
    budgetedAmount: number;
    currentAmount: number;
    resetFrequency: "monthly" | "weekly" | "once";
    lastResetDate: string;
    createdAt: string;
    updatedAt: string;
    relatedTransactionCount?: number;
    totalSpent?: number;
    remainingAmount?: number;
    isOverBudget?: boolean;
  }
  ```

---

### 2. Backend Service Layer (`apps/api/src/services/envelope.service.ts`)

Fungsi inti yang diimplementasikan:
- `calculateAvailableToSpend(db, userId)`:
  - Query total transaksi income milik user.
  - Query sum saldo `currentAmount` seluruh envelope user.
  - Return `totalIncome - totalEnvelopeBalance`.
- `listEnvelopes(db, userId)`:
  - List semua envelope user di-join dengan nama kategori.
- `getEnvelopeById(db, userId, id)`:
  - Mengambil envelope detail beserta `relatedTransactionCount`, `totalSpent`, `remainingAmount`, dan `isOverBudget`.
- `getEnvelopeDeletePreview(db, userId, id)`:
  - Mengembalikan saldo, jumlah transaksi terkait, dan apakah aksi saldo diperlukan.
- `createEnvelope(db, userId, input)`:
  - Cek nama duplikat untuk user yang sama (`409 Conflict`).
  - Cek kategori (`404 Not Found`).
  - Insert envelope dengan `currentAmount = 0` dan `lastResetDate = now`.
- `updateEnvelope(db, userId, id, input)`:
  - Cek keberadaan envelope (`404 Not Found`).
  - Cek duplikasi nama jika diubah (`409 Conflict`).
  - Update row envelope.
- `fillEnvelope(db, userId, id, amount)`:
  - Hitung `availableToSpend`. Jika `amount > availableToSpend`, throw `400 Bad Request` (`INSUFFICIENT_AVAILABLE_FUNDS`).
  - Tambahkan saldo `currentAmount` pada envelope.
  - Catat record transaksi mutasi (`type = "transfer"`, `destinationEnvelopeId = id`, `description = "Fill Envelope: <Name>"`).
- `transferEnvelopeFunds(db, userId, input)`:
  - Validasi source & destination envelope milik user.
  - Kurangi saldo envelope sumber, tambah saldo envelope tujuan.
  - Catat record transaksi transfer.
- `deleteEnvelope(db, userId, id, input)`:
  - Ambil envelope yang akan dihapus.
  - Menolak delete saldo non-zero tanpa pilihan eksplisit (`ENVELOPE_BALANCE_REQUIRES_ACTION`).
  - Jika ada `transferToEnvelopeId`, pindahkan `currentAmount` ke envelope target.
  - Hapus semua transaksi terkait (`envelopeId = id` ATAU `destinationEnvelopeId = id`).
  - Hapus baris envelope dari database.

---

### 3. Backend Routes (`apps/api/src/routes/envelopes.ts`) & Mount

Routing yang disediakan:
- `GET /api/envelopes`
- `GET /api/envelopes/:id`
- `POST /api/envelopes`
- `PUT /api/envelopes/:id`
- `DELETE /api/envelopes/:id`
- `POST /api/envelopes/:id/fill`
- `POST /api/envelopes/transfer`

Mounting di `apps/api/src/index.ts`:
- `app.route("/api/envelopes", envelopesRouter)`

---

## Verifikasi
- Validasi TypeScript compilation: `npm run build` / `pnpm build`
- Unit testing logika service & error handlers.
