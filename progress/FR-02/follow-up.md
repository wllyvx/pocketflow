# FR-02 Follow-up: Complete Frontend Contract and E2E Verification

## Scope

Selesaikan gap FR-02 yang ditemukan audit:

- Sinkronkan response shape frontend dengan API.
- Implementasikan edit transaksi.
- Lengkapi transfer dan validasi tanggal.
- Jalankan verifikasi end-to-end.
- Jangan mengubah kontrak API tanpa memperbarui `docs/API.md`.

## Tasks

- [x] Perbaiki `TransactionsPanel.astro`
  - Baca `data` sebagai array.
  - Baca metadata dari `pagination`.
  - Perbaiki pagination dan empty state.
  - Tambahkan filter envelope.

- [x] Lengkapi `AddTransactionModal.astro`
  - Support mode create dan edit.
  - Tambahkan destination envelope untuk transfer.
  - Jadikan envelope wajib hanya untuk expense.
  - Tambahkan validasi tanggal maksimal 1 tahun ke depan.
  - Pastikan receipt upload tidak merusak transaksi saat upload gagal.
  - Refresh dashboard dan transaction list setelah create/update/delete.

- [x] Implementasikan aksi Edit
  - Ambil transaksi berdasarkan ID.
  - Isi form dengan data transaksi.
  - Kirim `PUT /api/transactions/:id`.
  - Tampilkan error validasi dan error API.

- [x] Sinkronkan `api-client.ts`
  - Cocokkan tipe response list dengan API:
    `data: TransactionItem[]` dan `pagination`.
  - Cocokkan response delete dengan endpoint yang mengembalikan `message`.

- [x] Tambahkan atau jalankan pengujian:
  - Expense normal.
  - Expense overspending.
  - Income.
  - Transfer antar-envelope.
  - Edit transaksi.
  - Delete dan pemulihan saldo.
  - Filter dan pagination.

- [x] Jalankan:
  - `corepack pnpm typecheck`
  - `corepack pnpm --filter @pocketflow/api typecheck`
  - `corepack pnpm --filter @pocketflow/web check`
  - `corepack pnpm --filter @pocketflow/web build`

- [x] Setelah seluruh verifikasi berhasil, sinkronkan checklist di
  `progress/FR-02/task.md` dan `progress/FR-02/todo.md`.