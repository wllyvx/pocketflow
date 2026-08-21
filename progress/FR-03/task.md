# Task Execution Breakdown: FR-03 (Envelope Budgeting System)

Dokumen ini berisi daftar instruksi dan task terstruktur yang siap didelegasikan dan dikerjakan oleh coding agent untuk mengimplementasikan **FR-03: Envelope Budgeting System**.

## Status Implementasi

- [x] Task 1: Zod schemas dan shared types
- [x] Task 2: Service layer envelope
- [x] Task 3: API routes dan app mounting
- [x] Task 4: Dokumentasi kontrak API
- [x] Task 5: Type-check dan build workspace

## Follow-up FR-03

- [x] Delete balance action dan delete preview
- [x] Detail envelope spending summary
- [x] Operasi fill/transfer/delete atomic
- [x] Manage Envelopes UI dan API client
- [x] Dokumentasi dan roadmap diperbarui
- [x] Unit test terfokus dijalankan
- [ ] Coverage unit test penuh untuk semua skenario service

---

## 📋 Task 1: Zod Schemas & Shared Types (`@pocketflow/shared`)

### Target File:
- [`packages/shared/src/index.ts`](file:///d:/PERSONAL/App%20Development/Pocketflow/packages/shared/src/index.ts)

### Deliverables:
1. **Enum Reset Frequency:**
   ```typescript
   export const envelopeResetFrequencySchema = z.enum(["monthly", "weekly", "once"]);
   export type EnvelopeResetFrequency = z.infer<typeof envelopeResetFrequencySchema>;
   ```
2. **Create Envelope Schema:**
   ```typescript
   export const createEnvelopeSchema = z.object({
     name: z.string().trim().min(1, "Envelope name is required").max(80, "Envelope name must not exceed 80 characters"),
     categoryId: z.string().trim().min(1, "Category ID is required"),
     budgetedAmount: z.number({ invalid_type_error: "Budgeted amount must be a number" }).nonnegative("Budgeted amount cannot be negative"),
     resetFrequency: envelopeResetFrequencySchema.default("monthly"),
   });
   export type CreateEnvelopeInput = z.infer<typeof createEnvelopeSchema>;
   ```
3. **Update Envelope Schema:**
   ```typescript
   export const updateEnvelopeSchema = z.object({
     name: z.string().trim().min(1).max(80).optional(),
     categoryId: z.string().trim().min(1).optional(),
     budgetedAmount: z.number({ invalid_type_error: "Budgeted amount must be a number" }).nonnegative("Budgeted amount cannot be negative").optional(),
     resetFrequency: envelopeResetFrequencySchema.optional(),
   });
   export type UpdateEnvelopeInput = z.infer<typeof updateEnvelopeSchema>;
   ```
4. **Fill Envelope Schema:**
   ```typescript
   export const fillEnvelopeSchema = z.object({
     amount: z.number({ invalid_type_error: "Amount must be a number" }).positive("Fill amount must be greater than 0"),
   });
   export type FillEnvelopeInput = z.infer<typeof fillEnvelopeSchema>;
   ```
5. **Transfer Envelope Funds Schema:**
   ```typescript
   export const transferEnvelopeSchema = z.object({
     fromEnvelopeId: z.string().trim().min(1, "Source envelope ID is required"),
     toEnvelopeId: z.string().trim().min(1, "Destination envelope ID is required"),
     amount: z.number({ invalid_type_error: "Amount must be a number" }).positive("Transfer amount must be greater than 0"),
   }).superRefine((data, ctx) => {
     if (data.fromEnvelopeId === data.toEnvelopeId) {
       ctx.addIssue({
         code: z.ZodIssueCode.custom,
         path: ["toEnvelopeId"],
         message: "Source and destination envelopes must be different.",
       });
     }
   });
   export type TransferEnvelopeInput = z.infer<typeof transferEnvelopeSchema>;
   ```
6. **Delete Envelope Schema:**
   ```typescript
   export const deleteEnvelopeSchema = z.object({
     transferToEnvelopeId: z.string().trim().min(1).optional(),
   });
   export type DeleteEnvelopeInput = z.infer<typeof deleteEnvelopeSchema>;
   ```
7. **Envelope Types / Interfaces:**
   ```typescript
   export interface EnvelopeItem {
     id: string;
     userId: string;
     categoryId: string;
     categoryName?: string | null;
     name: string;
     budgetedAmount: number;
     currentAmount: number;
     resetFrequency: EnvelopeResetFrequency;
     lastResetDate: string;
     createdAt: string;
     updatedAt: string;
   }
   ```

---

## 📋 Task 2: Service Layer Logic (`apps/api/src/services/envelope.service.ts`)

### Target File:
- `[NEW]` [`apps/api/src/services/envelope.service.ts`](file:///d:/PERSONAL/App%20Development/Pocketflow/apps/api/src/services/envelope.service.ts)

### Methods to Implement:
1. **`calculateAvailableToSpend(db: Database, userId: string): Promise<number>`**
   - Ambil seluruh transaksi `income` milik user dan jumlahkan (`totalIncome`).
   - Ambil seluruh envelope milik user dan jumlahkan `currentAmount` (`totalEnvelopesCurrentAmount`).
   - Return `Math.max(0, totalIncome - totalEnvelopesCurrentAmount)` (atau nilai riil).
2. **`listEnvelopes(db: Database, userId: string): Promise<EnvelopeItem[]>`**
   - Query `envelopes` di-join dengan `categories` (`leftJoin(categories, eq(envelopes.categoryId, categories.id))`).
   - Urutkan berdasarkan `createdAt` asc / `name` asc.
   - Format tanggal ke string ISO.
3. **`getEnvelopeById(db: Database, userId: string, id: string): Promise<EnvelopeItem | null>`**
   - Query satu envelope berdasarkan ID dan `userId`.
4. **`createEnvelope(db: Database, userId: string, input: CreateEnvelopeInput): Promise<EnvelopeItem>`**
   - Cek kategori milik user / sistem (`categories.id = input.categoryId`). Jika tidak ditemukan throw `ServiceError("CATEGORY_NOT_FOUND", "Category not found.", 404)`.
   - Cek nama duplikat untuk user yang sama (`envelopes.userId = userId AND envelopes.name = input.name`). Jika ada throw `ServiceError("DUPLICATE_NAME", "An envelope with this name already exists.", 409)`.
   - Insert ke database dengan `currentAmount: 0`, `lastResetDate: now`, `createdAt: now`, `updatedAt: now`.
5. **`updateEnvelope(db: Database, userId: string, id: string, input: UpdateEnvelopeInput): Promise<EnvelopeItem>`**
   - Validasi envelope ada dan milik user.
   - Jika nama diubah, cek duplikasi nama pada envelope user lain.
   - Update field yang diberikan.
6. **`fillEnvelope(db: Database, userId: string, id: string, input: FillEnvelopeInput): Promise<EnvelopeItem>`**
   - Validasi envelope ada dan milik user.
   - Hitung `availableToSpend = await calculateAvailableToSpend(db, userId)`.
   - Jika `input.amount > availableToSpend`, throw `ServiceError("INSUFFICIENT_AVAILABLE_FUNDS", "Insufficient available funds to fill envelope.", 400)`.
   - Tambahkan `currentAmount += input.amount` pada envelope.
   - **Buat transaksi mutasi log:**
     - `type: "transfer"`
     - `amount: input.amount`
     - `description: "Fill Envelope: " + envelope.name`
     - `destinationEnvelopeId: id`
     - `isManual: true`
     - `date: now`
7. **`transferEnvelopeFunds(db: Database, userId: string, input: TransferEnvelopeInput): Promise<void>`**
   - Validasi kedua envelope (source & destination) ada dan milik user.
   - Cek saldo envelope sumber. (Catatan: boleh transfer jika saldo mencukupi).
   - Kurangi `fromEnvelope.currentAmount -= input.amount`.
   - Tambahkan `toEnvelope.currentAmount += input.amount`.
   - Buat transaksi log `type: "transfer"`, `envelopeId: fromEnvelopeId`, `destinationEnvelopeId: toEnvelopeId`, `description: "Transfer funds from ... to ..."`.
8. **`deleteEnvelope(db: Database, userId: string, id: string, input?: DeleteEnvelopeInput): Promise<void>`**
   - Ambil envelope yang akan dihapus.
   - Jika `input?.transferToEnvelopeId`:
     - Validasi target envelope ada dan milik user.
     - Tambahkan sisa saldo `currentAmount` ke target envelope.
   - **Cascade Delete Transaksi:**
     - Hapus semua transaksi dari tabel `transactions` yang memiliki `envelopeId = id` ATAU `destinationEnvelopeId = id`.
   - Hapus envelope dari tabel `envelopes`.

---

## 📋 Task 3: API Route Handlers (`apps/api/src/routes/envelopes.ts`) & App Mounting

### Target Files:
- `[NEW]` [`apps/api/src/routes/envelopes.ts`](file:///d:/PERSONAL/App%20Development/Pocketflow/apps/api/src/routes/envelopes.ts)
- `[MODIFY]` [`apps/api/src/index.ts`](file:///d:/PERSONAL/App%20Development/Pocketflow/apps/api/src/index.ts)

### Endpoints to Expose:
- `GET /api/envelopes` -> Memanggil `listEnvelopes` -> Return `200 OK` `{ success: true, data: items }`
- `GET /api/envelopes/:id` -> Memanggil `getEnvelopeById` -> Return `200 OK` / `404 Not Found`
- `POST /api/envelopes` -> Validasi `createEnvelopeSchema` -> Memanggil `createEnvelope` -> Return `201 Created`
- `PUT /api/envelopes/:id` -> Validasi `updateEnvelopeSchema` -> Memanggil `updateEnvelope` -> Return `200 OK`
- `DELETE /api/envelopes/:id` -> Validasi `deleteEnvelopeSchema` -> Memanggil `deleteEnvelope` -> Return `200 OK` `{ success: true, message: "Envelope and associated transactions deleted successfully." }`
- `POST /api/envelopes/:id/fill` -> Validasi `fillEnvelopeSchema` -> Memanggil `fillEnvelope` -> Return `200 OK`
- `POST /api/envelopes/transfer` -> Validasi `transferEnvelopeSchema` -> Memanggil `transferEnvelopeFunds` -> Return `200 OK`

### Mounting in `apps/api/src/index.ts`:
- Import `envelopesRouter` dan pasang di `app.route("/api/envelopes", envelopesRouter);`.

---

## 📋 Task 4: Dokumentasi Kontrak (`docs/API.md`)

### Target File:
- [`docs/API.md`](file:///d:/PERSONAL/App%20Development/Pocketflow/docs/API.md)

### Deliverables:
- Perbarui seksi **Budget Envelopes** agar mencantumkan seluruh 7 endpoint dengan request/response schema, status codes (`200`, `201`, `400`, `401`, `404`, `409`), dan contoh body.

---

## 📋 Task 5: Testing & Quality Checks

### Verification Steps:
1. Jalankan type-check & build untuk memastikan tidak ada compiler errors:
   - `npm run build` / `npx tsc --noEmit`
2. Jalankan test otomatis atau verifikasi API logic dengan skenario:
   - Duplikasi nama envelope menghasilkan `409 Conflict`.
   - Fill melebihi "Available to Spend" menghasilkan `400 Bad Request`.
   - Transfer antar envelope memutasi saldo kedua envelope.
   - Delete envelope menghapus envelope beserta seluruh transaksi yang terkait.
