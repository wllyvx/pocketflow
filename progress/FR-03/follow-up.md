# Follow-up Tasks: FR-03 Envelope Budgeting

## Tujuan

Menyelesaikan seluruh kekurangan FR-03 pada backend, kontrak API, testing, atomicity database, dan frontend.

## Status

- [x] Delete envelope bersaldo membutuhkan pilihan eksplisit.
- [x] Delete preview tersedia.
- [x] Kontrak detail envelope memiliki spending summary.
- [x] Endpoint FR-03 dan dokumentasi API diselaraskan.
- [x] Operasi fill, transfer, dan delete dibungkus transaksi Drizzle.
- [x] Halaman Manage Envelopes tersedia dengan loading, empty, success, error, dan delete confirmation state.
- [x] Unit test terfokus untuk schema, delete guard, dan preview lulus.
- [ ] Coverage unit test penuh untuk seluruh skenario service database.

## Referensi

- `docs/REQUIREMENTS.md`
- `docs/API.md`
- `docs/ROADMAP.md`
- `docs/USER_FLOW.md`
- `progress/FR-03/implementation_plan.md`
- `progress/FR-03/task.md`

## Aturan untuk Agent

- Ikuti arsitektur Hono + Drizzle ORM + Cloudflare D1.
- Business logic harus berada di `apps/api/src/services/`.
- Gunakan schema Zod dari `packages/shared`.
- Semua endpoint harus memakai format response standar.
- Semua query wajib dibatasi berdasarkan `userId`.
- Jangan mengubah kontrak API tanpa memperbarui `docs/API.md`.
- Jangan memperbaiki bug di luar cakupan FR-03.
- Jalankan validasi setelah setiap kelompok perubahan.

---

## Task 1: Konfirmasi Delete Envelope dengan Saldo

### Masalah

Requirement FR-03 menyatakan bahwa envelope dengan saldo non-zero harus meminta user memilih:

1. Memindahkan saldo ke envelope lain.
2. Mengembalikan saldo ke `Available to Spend`.

Saat ini delete tanpa body tetap dapat dilakukan untuk envelope yang memiliki saldo.

### File terkait

- `apps/api/src/routes/envelopes.ts`
- `apps/api/src/services/envelope.service.ts`
- `packages/shared/src/index.ts`
- `docs/API.md`

### Pekerjaan

- Cek `currentAmount` sebelum menghapus envelope.
- Jika saldo non-zero dan `transferToEnvelopeId` tidak diberikan, kembalikan error `400`.
- Gunakan error code:
  - `ENVELOPE_BALANCE_REQUIRES_ACTION`
- Jika saldo `0`, delete dapat dilakukan langsung.
- Jika `transferToEnvelopeId` diberikan:
  - Pastikan target berbeda dari envelope asal.
  - Pastikan target dimiliki user yang sama.
  - Pindahkan saldo ke target.
  - Hapus envelope asal.
- Tentukan cara eksplisit untuk pilihan “kembalikan ke Available to Spend”.
- Perbarui schema, route, service, dan dokumentasi agar konsisten.

### Acceptance Criteria

- Delete envelope saldo `0` berhasil.
- Delete envelope saldo non-zero tanpa pilihan gagal dengan status `400`.
- Delete dengan target valid memindahkan saldo.
- Target envelope user lain menghasilkan `404`.
- Target sama dengan envelope asal menghasilkan `400`.
- Error response tercantum di `docs/API.md`.

---

## Task 2: Tambahkan Delete Preview

### Tujuan

Client perlu mengetahui saldo dan jumlah transaksi yang akan terhapus sebelum meminta konfirmasi user.

### Endpoint

```text
GET /api/envelopes/:id/delete-preview
```

### Response

```json
{
  "success": true,
  "data": {
    "envelopeId": "envelope-uuid",
    "currentAmount": 250,
    "relatedTransactionCount": 4,
    "requiresBalanceAction": true
  }
}
```

### Pekerjaan

- Tambahkan fungsi service untuk mengambil informasi preview.
- Hitung transaksi terkait menggunakan kondisi:
  - `transactions.envelopeId = envelopeId`
  - atau `transactions.destinationEnvelopeId = envelopeId`
- Pastikan envelope dimiliki user aktif.
- Tambahkan route baru.
- Dokumentasikan endpoint di `docs/API.md`.

### Acceptance Criteria

- Preview envelope milik user berhasil.
- Envelope tidak ditemukan menghasilkan `404`.
- Jumlah transaksi sesuai database.
- `requiresBalanceAction` bernilai `true` jika saldo tidak sama dengan `0`.
- Data user lain tidak dapat diakses.

---

## Task 3: Selaraskan Kontrak getEnvelopeById

### Masalah

Implementation plan menyebut detail transaksi dan spending summary, tetapi service saat ini hanya mengembalikan `EnvelopeItem`.

### File terkait

- `progress/FR-03/implementation_plan.md`
- `packages/shared/src/index.ts`
- `apps/api/src/services/envelope.service.ts`
- `apps/api/src/routes/envelopes.ts`
- `docs/API.md`

### Pekerjaan

Pilih salah satu pendekatan:

1. Pertahankan response sederhana dan ubah implementation plan.
2. Tambahkan summary ke response envelope.

Jika summary ditambahkan, pertimbangkan field berikut:

```ts
{
  relatedTransactionCount: number;
  totalSpent: number;
  remainingAmount: number;
  isOverBudget: boolean;
}
```

### Acceptance Criteria

- Implementation plan, shared type, service, route, dan API docs memiliki kontrak yang sama.
- Tidak ada field yang didokumentasikan tetapi tidak dikembalikan API.
- Tambahkan test untuk response detail envelope.

---

## Task 4: Lengkapi Dokumentasi API

### File

- `docs/API.md`

### Endpoint yang wajib didokumentasikan

- `GET /api/envelopes`
- `GET /api/envelopes/:id`
- `GET /api/envelopes/:id/delete-preview`
- `POST /api/envelopes`
- `PUT /api/envelopes/:id`
- `DELETE /api/envelopes/:id`
- `POST /api/envelopes/:id/fill`
- `POST /api/envelopes/transfer`

### Setiap endpoint harus memiliki

- Method dan path.
- Authentication requirement.
- Request body atau query parameter.
- Success response lengkap.
- Error response lengkap.
- Status code.
- Contoh request valid.
- Contoh error.
- Error code yang mungkin muncul.

### Acceptance Criteria

- Semua endpoint FR-03 terdokumentasi lengkap.
- Response menggunakan format `success`, `data`, `error`, dan `message` yang konsisten.
- Status code hanya mencantumkan status yang benar-benar mungkin digunakan.
- Perilaku delete dengan saldo non-zero dijelaskan.

---

## Task 5: Tambahkan Unit Test Service Envelope

### File yang disarankan

```text
apps/api/src/services/envelope.service.test.ts
```

Gunakan pola test yang sudah tersedia di repository jika ada.

### Skenario Create

- Berhasil membuat envelope.
- Nama duplikat pada user yang sama menghasilkan `DUPLICATE_NAME`.
- Nama sama pada user berbeda tetap diperbolehkan.
- Kategori tidak valid menghasilkan `CATEGORY_NOT_FOUND`.
- `resetFrequency` default adalah `monthly`.
- `currentAmount` awal adalah `0`.

### Skenario Update

- Berhasil mengubah nama.
- Berhasil mengubah budget.
- Berhasil mengubah kategori.
- Berhasil mengubah reset frequency.
- Envelope user lain tidak dapat diubah.
- Nama duplikat menghasilkan status `409`.
- Kategori user lain tidak dapat digunakan.

### Skenario Fill

- Fill valid menambah `currentAmount`.
- Fill valid membuat transaction log.
- Transaction log memiliki:
  - `type = "transfer"`
  - `destinationEnvelopeId`
  - `isManual = true`
  - description `Fill Envelope: <name>`
- Fill melebihi `Available to Spend` menghasilkan `400`.
- Fill envelope user lain menghasilkan `404`.

### Skenario Transfer

- Saldo source berkurang.
- Saldo destination bertambah.
- Transaction log berhasil dibuat.
- Transfer melebihi saldo source gagal.
- Transfer ke envelope user lain gagal.
- Transfer ke envelope yang sama gagal.
- Transfer dengan amount tidak valid gagal.

### Skenario Delete

- Delete envelope saldo nol berhasil.
- Transaksi dengan `envelopeId` terkait ikut terhapus.
- Transaksi dengan `destinationEnvelopeId` terkait ikut terhapus.
- Delete dengan target memindahkan saldo.
- Target tidak valid menghasilkan error.
- Delete bersaldo tanpa pilihan mengikuti kontrak baru.
- Delete envelope user lain menghasilkan `404`.

---

## Task 6: Pastikan Operasi Database Atomic

### Masalah

Operasi fill dan transfer melakukan beberapa query terpisah. Jika salah satu query gagal, saldo dan transaction log dapat tidak sinkron.

### File

- `apps/api/src/services/envelope.service.ts`

### Pekerjaan

Gunakan mekanisme transaction atau batch yang didukung Cloudflare D1 dan Drizzle untuk memastikan operasi berikut diproses sebagai satu unit:

- Update saldo envelope.
- Insert transaction log.
- Pemindahan saldo saat delete.

Terapkan minimal pada:

- `fillEnvelope`
- `transferEnvelopeFunds`
- `deleteEnvelope` dengan `transferToEnvelopeId`

### Acceptance Criteria

- Tidak ada transaction log tanpa perubahan saldo.
- Tidak ada perubahan saldo tanpa transaction log.
- Kegagalan query tidak meninggalkan perubahan parsial.
- Tambahkan test untuk failure path jika database mock mendukungnya.

---

## Task 7: Implementasikan Halaman Kelola Envelope

### Lokasi

- `apps/web/src/pages/`
- `apps/web/src/components/`
- `apps/web/src/lib/api-client.ts`

### Pekerjaan

Buat flow UI untuk:

- Menampilkan daftar envelope.
- Membuat envelope.
- Mengedit envelope.
- Menghapus envelope.
- Mengisi envelope.
- Transfer antar-envelope.
- Menampilkan budget dan saldo saat ini.
- Menampilkan kategori dan reset frequency.
- Menampilkan loading state.
- Menampilkan empty state.
- Menampilkan error API.
- Menampilkan konfirmasi delete.
- Memanggil delete preview sebelum delete envelope bersaldo.

### Acceptance Criteria

- User dapat menyelesaikan seluruh flow FR-03 dari UI.
- Semua request memakai API client terpusat.
- Error insufficient funds ditampilkan dengan pesan jelas.
- User tidak dapat memilih envelope milik user lain.
- UI berjalan pada desktop dan mobile.
- Saldo dan daftar envelope diperbarui setelah operasi berhasil.

---

## Task 8: Verifikasi dan Dokumentasi Status

### Jalankan perintah berikut

```bash
pnpm typecheck
pnpm build
pnpm check
```

Jika test runner tersedia:

```bash
pnpm test
```

### Perbarui file

- `progress/FR-03/follow-up.md`
- `progress/FR-03/task.md`
- `docs/ROADMAP.md`
- `docs/API.md`
- `progress/FR-03/implementation_plan.md` jika kontrak berubah

### Definition of Done

- [ ] Delete envelope bersaldo membutuhkan pilihan eksplisit.
- [ ] Delete preview tersedia.
- [ ] Semua endpoint FR-03 terdokumentasi lengkap.
- [ ] Kontrak `getEnvelopeById` sudah konsisten.
- [ ] Test create, update, fill, transfer, dan delete tersedia.
- [ ] Test utama berhasil dijalankan.
- [ ] Operasi fill dan transfer atomic.
- [ ] Halaman Kelola Envelope tersedia.
- [ ] Loading, empty, success, dan error state tersedia.
- [ ] `pnpm typecheck` berhasil.
- [ ] `pnpm build` berhasil.
- [ ] `pnpm check` berhasil.
- [ ] Status roadmap diperbarui berdasarkan hasil nyata.
```