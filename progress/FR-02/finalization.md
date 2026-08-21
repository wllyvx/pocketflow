# FR-02 Finalization Tasks

## Tujuan

Menutup sisa gap frontend FR-02 dan melakukan verifikasi nyata sebelum FR-02 ditandai selesai.

Referensi:
- `docs/REQUIREMENTS.md`
- `docs/API.md`
- `apps/web/src/components/AddTransactionModal.astro`
- `apps/web/src/components/TransactionsPanel.astro`

## 1. Lengkapi Form Transaksi

- [x] Ganti `<select>` tipe transaksi dengan segmented control:
  - Expense
  - Income
  - Transfer
- [x] Pastikan tipe aktif memiliki styling berbeda sesuai design system.
- [x] Tambahkan input nominal dengan format mata uang IDR.
- [x] Nilai yang dikirim ke API tetap berupa number, bukan string terformat.
- [x] Pastikan nominal kosong, nol, negatif, dan bukan angka menampilkan error inline.
- [x] Tampilkan destination envelope hanya ketika tipe `transfer`.
- [x] Envelope wajib untuk `expense`.
- [x] Source dan destination envelope wajib untuk `transfer`.
- [x] Source dan destination envelope tidak boleh sama.
- [x] Pertahankan validasi tanggal maksimal satu tahun ke depan.

## 2. Lengkapi Daftar Transaksi

- [x] Tampilkan envelope name atau badge envelope pada setiap row.
- [x] Tampilkan amount dengan format yang konsisten:
  - Income: `+ Rp ...`
  - Expense: `- Rp ...`
  - Transfer: `Rp ...`
- [x] Tampilkan icon dan warna berbeda untuk income, expense, dan transfer.
- [x] Tampilkan tanggal transaksi dengan format lokal.
- [x] Tampilkan indikator over-budget bila transaksi terkait envelope dengan saldo negatif.
- [x] Pastikan filter tipe dan envelope bekerja bersama.
- [x] Pastikan pagination menggunakan response API:
  - `data: TransactionItem[]`
  - `pagination.totalPages`
  - `pagination.currentPage`

## 3. Verifikasi Edit dan Delete

- [x] Tombol Edit membuka modal dengan data transaksi yang benar.
- [x] Simpan edit menggunakan `PUT /api/transactions/:id`.
- [x] Pastikan perubahan amount/type/envelope memperbarui saldo dengan benar.
- [x] Delete meminta konfirmasi.
- [x] Setelah delete, transaksi hilang dari daftar.
- [x] Setelah delete, saldo envelope dipulihkan.
- [x] Dashboard dan daftar transaksi refresh setelah create, update, dan delete.

## 4. Tambahkan Pengujian Nyata

Repository belum memiliki setup Playwright atau test runner untuk skenario berikut. Item ini tetap terbuka sampai test executable ditambahkan dan dijalankan:

- [ ] Create expense normal dan verifikasi saldo envelope berkurang.
- [ ] Create expense overspending dan verifikasi saldo negatif serta indikator merah.
- [ ] Create income dan verifikasi saldo envelope bertambah.
- [ ] Create transfer dan verifikasi saldo source/destination.
- [ ] Edit amount dan verifikasi delta saldo.
- [ ] Edit envelope dan verifikasi saldo envelope lama/baru.
- [ ] Delete expense dan verifikasi saldo kembali.
- [ ] Filter berdasarkan tipe.
- [ ] Filter berdasarkan envelope.
- [ ] Pagination dengan lebih dari satu halaman.
- [ ] Validasi amount dan tanggal.
- [ ] Receipt upload gagal tidak menghapus transaksi yang sudah tersimpan.

## 5. Validasi Kontrak

- [x] Pastikan `api-client.ts` menggunakan response list API yang benar.
- [x] Pastikan response delete menggunakan `message`, bukan `data.deleted`.
- [x] Jangan mengubah format API tanpa memperbarui `docs/API.md`.
- [x] Pastikan field receipt konsisten menggunakan `receiptImageUrl`.

## 6. Quality Checks

Hasil verifikasi:

- [x] `corepack pnpm typecheck`
- [x] `corepack pnpm --filter @pocketflow/api typecheck`
- [x] `corepack pnpm --filter @pocketflow/web check`
- [x] `corepack pnpm --filter @pocketflow/web build`
