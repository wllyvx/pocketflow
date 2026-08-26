---
title: FR-07 Receipt Attachment & Storage
labels: [ready-for-agent]
status: open
---

## Problem Statement

Sebagai user PocketFlow, saya tidak punya cara melampirkan bukti pembelian (foto struk) ke transaksi yang saya catat. Akibatnya catatan keuangan saya sulit diverifikasi: saat mereview pengeluaran, saya tidak bisa mengingat atau membuktikan dari mana uang saya keluar, dan saya tidak punya arsip struk yang terikat pada transaksinya.

## Solution

Saat menambah atau mengedit transaksi, saya bisa memilih gambar struk (JPEG/PNG, maks 5MB) untuk dilampirkan. Gambar disimpan aman di Cloudflare R2 dan hanya bisa dilihat oleh saya (bukan URL publik). Di detail transaksi saya bisa melihat struk yang terlampir dan menghapusnya jika tidak dibutuhkan. Upload terjadi terpisah dari penyimpanan transaksi, sehingga kalau koneksi gagal saat upload, data transaksi saya tidak rusak dan saya cukup mengulang upload-nya.

## User Stories

1. As a user, I want to attach a receipt image when creating a transaction, so that I have proof of the purchase tied to my record.
2. As a user, I want to attach a receipt image when editing an existing transaction, so that I can add documentation to records I made earlier.
3. As a user, I want my receipt stored privately so that only I can view it, even if someone obtains the link.
4. As a user, I want an upload that is separate from saving the transaction, so that a network failure during upload never corrupts or loses my transaction data.
5. As a user, I want to retry a failed upload without recreating the transaction, so that recovery is quick and painless.
6. As a user, I want to see the attached receipt from the transaction detail screen, so that I can verify what I spent on.
7. As a user, I want to view the receipt image enlarged in a simple modal, so that I can read the details on the receipt.
8. As a user, I want to delete an attached receipt without deleting the transaction, so that I stay in control of my stored files.
9. As a user, I want replacing a receipt during edit to remove the old file from storage, so that no orphaned copies of my documents remain.
10. As a user, I want deleting a transaction to also remove its receipt from storage, so that my deleted data does not linger.
11. As a user, I want unsupported file types (not JPEG/PNG) rejected with a clear message before the request is sent, so that I get immediate feedback instead of a failed upload.
12. As a user, I want files larger than 5MB rejected with a clear message before upload, so that I know why my file was refused.
13. As a user, I want server-side validation of type and size, so that a malformed or spoofed request cannot bypass client checks.
14. As a user, I want my receipts deleted immediately and permanently when my account is deleted, so that my financial documents do not outlive my account.
15. As a developer/maintainer, I want receipts scoped by owner key structure, so that ownership checks are simple and auditable.
16. As a maintainer, I want all receipt storage access funneled through one service boundary, so that storage logic has a single seam to test and evolve.
17. As a maintainer, I want local development to work against simulated R2, so that end-to-end receipt flows can be verified without deploying.

## Implementation Decisions

**Access model** — Bucket R2 privat. Tidak ada URL publik. File hanya disajikan lewat endpoint proxy terautentikasi `GET /receipts/:key` yang memverifikasi ownership (key harus milik user pada JWT) dan merespons binary dengan Content-Type sesuai serta `Cache-Control: private`.

**Upload flow (decoupled / upload-first)** — Client mengunggah via `POST /receipts` (multipart) lebih dulu, menerima balikan object key + URL proxy, lalu menyertakan `receiptImageUrl` pada payload create/edit transaksi. Kegagalan upload dapat di-retry tanpa menyentuh transaksi. Pola ini mempertahankan kontrak service transaksi yang sudah ada.

**Stored value vs exposed value** — Kolom `receipt_url` di tabel transactions menyimpan *object key* (skema: prefix per-user dengan UUID + ekstensi), bukan URL publik. Response API transaksi tetap mengekspos field `receiptImageUrl` sebagai URL proxy agar kontrak di docs/API.md tetap berbentuk URL. Dokumen DATABASE.md dan API.md akan diupdate di akhir implementasi untuk mencerminkan ini (DATABASE.md saat ini mendeskripsikan kolom sebagai "URL to R2").

**Cleanup eager** — Objek R2 dihapus pada tiga kejadian: (1) hapus receipt eksplisit via `DELETE /receipts/:key`, (2) edit transaksi dengan `receiptImageUrl: null`, (3) hapus transaksi yang memiliki receipt. Penggantian receipt saat edit juga menghapus objek lama. Tidak ada garbage collection berkala.

**Retention saat hapus akun** — Hard delete langsung semua receipt milik user. Keputusan ini menutup open question retensi di docs/REQUIREMENTS.md §6 (akan dicatat di dokumen tersebut).

**Validasi server-side** — Allowlist Content-Type JPEG/PNG, pengecekan ukuran ≤5MB, plus magic-byte sniffing pada byte awal file sebagai proteksi murah terhadap spoofing tipe. Validasi client-side (tipe + ukuran, sebelum request dikirim) tetap ada demi feedback instan, tapi bukan lapisan keamanan.

**Struktur modul** — Semua logika penyimpanan receipt (validasi, generate key, put/get/delete R2, pembentukan URL proxy) hidup di satu modul service baru di sisi API; route receipts menjadi tipis (auth + wiring saja). Service transaksi memanggil fungsi delete dari service receipt untuk cleanup eager. Sesuai ARCHITECTURE.md: logika bisnis di services, bukan di route handler.

**Infrastruktur lokal** — Binding `RECEIPTS_BUCKET` diaktifkan pada konfigurasi Worker; development memakai simulasi R2 bawaan wrangler (`--local`) sehingga alur end-to-end dapat dites tanpa deploy.

**Frontend** — Upload di panel transaksi saat tambah/edit; thumbnail/link receipt pada detail transaksi; lihat via modal `<img>` sederhana (tanpa library lightbox); tombol hapus receipt. Zod schema untuk validasi upload didefinisikan/reused dari packages/shared.

## Testing Decisions

- **Prinsip**: hanya perilaku eksternal yang dites — key yang dikembalikan, penolakan file invalid (tipe/ukuran/magic-byte), ownership saat get/delete, efek cleanup — bukan detail implementasi internal.
- **Satu seam**: seluruh test berfokus pada boundary service receipt. Dependensi `R2Bucket` di-inject seperti dependensi `db` D1 pada service lain, sehingga satu in-memory fake bucket dipakai untuk semua kasus (upload, serve, delete, cleanup dari transaction.service).
- **Prior art**: gaya test mengikuti test service eksisting (vitest, fake DB hand-roll, asersi error `{ code, statusCode }`) plus kontrak skema Zod dari packages/shared.
- **Tidak ada** test level HTTP route maupun frontend automation — konsisten dengan coverage eksisting; verifikasi UI manual.

## Out of Scope

- Donation/monetization (FR-09, fase berikutnya) — meski nomor PRD lama menyebut lain, REQUIREMENTS.md adalah sumber kebenaran scope.
- PDF receipt, HEIC, kompresi/resizing gambar, OCR.
- Presigned URL S3-style, CDN publik, atau bucket publik.
- Garbage collection berkala / lifecycle rules R2.
- Lightbox/galeri canggih, multi-receipt per transaksi.
- Grace period atau arsip saat penghapusan akun.
- Perubahan pada Plaid sync / import otomatis (Fase 2).

## Further Notes

- Spesifikasi produk sumber: REQUIREMENTS.md FR-07, FEATURES.md §8, USER_FLOW.md (wireframe lampirkan receipt), API.md (field `receiptImageUrl`), DATABASE.md (kolom `receiptImageUrl`).
- AC spesifik dari REQUIREMENTS.md yang wajib terpenuhi: (a) penolakan tipe file didukung dengan pesan jelas di sisi client sebelum request dikirim; (b) kegagalan network saat upload tidak merusak data transaksi (decoupled/retryable).
- Update dokumentasi wajib di akhir implementasi: DATABASE.md (kolom menyimpan object key), API.md (endpoint receipts baru), REQUIREMENTS.md §6 (retention closed), ROADMAP.md (centang item FR-07).
- Dev account untuk testing manual: dev-account@test.com.
