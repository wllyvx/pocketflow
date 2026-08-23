# REQUIREMENTS.md: PocketFlow

Dokumen ini menerjemahkan PRD.md dan FEATURES.md menjadi requirement yang actionable, dengan pembagian jelas antara **MVP (Fase 1)** dan **fase berikutnya**. Dokumen ini menjadi acuan utama bagi AI coding agent saat development.

Konteks proyek: dikembangkan oleh **solo developer dibantu AI coding agent**, tanpa deadline kalender yang kaku — prioritas mengikuti urutan fase pada ROADMAP.md.

---

## 1. Ruang Lingkup MVP (Fase 1)

Fitur berikut **WAJIB** ada di rilis pertama:

| # | Fitur | Sumber (FEATURES.md) |
|---|---|---|
| 1 | Auth & Onboarding (tanpa Plaid Link) | Bagian 1 |
| 2 | Manual Transaction Management | Bagian 2 |
| 3 | Envelope Budgeting System | Bagian 4 |
| 4 | Gamified Financial Dashboard | Bagian 5 |
| 5 | Achievements & Rewards (versi dasar) | Bagian 6 |
| 6 | Financial Insights & Reporting | Bagian 7 |
| 7 | Receipt Attachment & Storage | Bagian 8 |

Fitur berikut **DITUNDA** ke fase berikutnya (lihat ROADMAP.md):

| # | Fitur | Alasan Penundaan |
|---|---|---|
| 1 | Automated Bank Transaction Sync (Plaid) | Kompleksitas integrasi + biaya Plaid; MVP fokus pencatatan manual dulu |
| 2 | Voluntary Donation Support | Monetisasi bukan prioritas sebelum ada basis user aktif |
| 3 | Admin System Health Monitoring | Tidak kritikal sebelum ada traffic produksi |
| 4 | Plaid Link saat onboarding | Terikat pada penundaan Plaid sync |

---

## 2. Functional Requirements — MVP

### FR-01: Autentikasi & Onboarding
- User dapat mendaftar via email/password melalui Auth0.
- User dapat login via Google/Apple Social Login (Auth0).
- Setelah registrasi, user diarahkan ke flow onboarding singkat (tanpa link bank) yang membuat 3-5 envelope starter (opsional, bisa di-skip).
- User dapat reset password.
- **Acceptance Criteria:**
  - Registrasi gagal dengan pesan jelas jika email sudah terdaftar.
  - Setelah login sukses, user menerima JWT yang valid dan diarahkan ke Dashboard.
  - Skip onboarding tetap membawa user ke Dashboard kosong yang informatif (empty state).

### FR-02: Manual Transaction Management
- User dapat menambah transaksi: income, expense, transfer (amount, tanggal, envelope, note opsional).
- User dapat mengedit dan menghapus transaksi manual.
- Validasi: amount harus > 0, tanggal tidak boleh lebih dari 1 tahun ke depan.
- **Acceptance Criteria:**
  - Transaksi baru langsung memperbarui saldo envelope terkait dan "Available to Spend".
  - Transaksi expense yang menyebabkan overspending pada envelope tetap tersimpan, tapi UI menampilkan indikator over-spending.

### FR-03: Envelope Budgeting System
- User dapat membuat, mengedit, menghapus envelope (nama unik per user, budget amount, reset frequency: monthly/weekly/once).
- User dapat mengisi ("fill") envelope dari pool "Available to Spend".
- User dapat memindahkan dana antar-envelope.
- Menghapus envelope dengan saldo non-zero harus meminta user memilih: pindahkan sisa dana ke envelope lain, atau kembalikan ke "Available to Spend".
- **Acceptance Criteria:**
  - Tidak bisa membuat envelope dengan nama duplikat (per user).
  - Fill envelope gagal dengan pesan jelas jika dana "Available to Spend" tidak cukup.
  - Setiap envelope menampilkan **health bar** yang merepresentasikan sisa dana: hijau (sisa >30%), kuning (sisa 1-30%), merah (0% = depleted/habis), ungu (surplus: saldo > budget), dan merah dengan badge "OVER SPENDING" bila saldo negatif (over-spending).
  - Envelope yang dibuat namun belum di-fill menampilkan status "Not Funded" (bar abu-abu, tanpa badge).
  - Tooltip health bar menampilkan informasi budget, current, spent, persen health, dan status label.

### FR-04: Gamified Dashboard
- Menampilkan "Available to Spend" secara prominent.
- **Health bar** per envelope dengan perubahan warna: hijau (sisa >30%), kuning (sisa 1-30%), merah (0% = depleted), plus badge "SURPLUS" bila saldo melebihi budget dan badge "OVER SPENDING" bila saldo negatif (over-spending).
- "Financial Health Score" — formula awal MVP: kombinasi dari (a) % envelope yang tidak over-spending bulan ini, (b) konsistensi pencatatan transaksi (hari aktif/30 hari). Detail formula didefinisikan saat implementasi, tapi harus deterministik dan dapat dijelaskan ke user.
- Daftar transaksi terbaru (5-10 item terakhir).
- **Acceptance Criteria:**
  - Dashboard tetap render dengan baik (empty state) untuk user baru tanpa envelope/transaksi.

### FR-05: Achievements & Rewards (versi dasar MVP)
- Set achievement awal (contoh, final list ditentukan saat desain):
  - "First Transaction Logged"
  - "First Envelope Created"
  - "First Budget Cycle Complete tanpa Overspending"
  - "7-Day Logging Streak"
- Achievement dievaluasi via scheduled check atau event-triggered check setelah aksi relevan (bukan realtime critical).
- Achievement yang sudah didapat tidak pernah dicabut walau data historis berubah (sesuai edge case di FEATURES.md).
- **Acceptance Criteria:**
  - User mendapat notifikasi in-app saat achievement baru terbuka.
  - Halaman "My Achievements" menampilkan status locked/unlocked semua achievement.

### FR-06: Financial Insights & Reporting
- Spending by category (pie/bar chart) untuk rentang tanggal yang dipilih. ✅ Phase 1: horizontal bar chart di `/insights`.
- Income vs Expense trend (line chart). ✅ Phase 1: line chart dengan granularity otomatis (daily/weekly/monthly) dari API.
- Net worth over time — **ditunda ke Fase 2** bersama item roadmap Plaid ("Net Worth calculation di Insights diperbarui memakai saldo real dari Plaid"); tidak termasuk dalam MVP Phase 1.
- Filter rentang tanggal: 7 hari, bulan berjalan, 3 bulan, custom. ✅ Phase 1.
- Dashboard "Spending Rhythm" card menampilkan data current month dari endpoint insights yang sama dan link ke `/insights`. ✅ Phase 1.
- **Acceptance Criteria:**
  - Chart menampilkan empty state yang jelas bila tidak ada data pada rentang dipilih. ✅
  - ~~Net worth over time~~ — deferred (lihat catatan di atas).

### FR-07: Receipt Attachment & Storage
- User dapat upload gambar (JPEG/PNG, maks 5MB) saat menambah/mengedit transaksi.
- File disimpan di Cloudflare R2, transaksi menyimpan `receiptUrl`.
- User dapat melihat dan menghapus receipt dari detail transaksi.
- **Acceptance Criteria:**
  - Upload dengan tipe file tidak didukung ditolak dengan pesan jelas di sisi client sebelum request dikirim.
  - Kegagalan network saat upload tidak merusak data transaksi yang sudah tersimpan (upload dan create transaksi harus decoupled/retryable).

---

## 3. Functional Requirements — Fase Berikutnya (ringkas)

- **FR-08 (Fase 2): Automated Bank Sync** — Plaid Link, sinkronisasi transaksi berkala, deteksi duplikat, kategorisasi otomatis.
- **FR-09 (Fase 2/3): Donation Support** — payment gateway (mis. Stripe), halaman "Support PocketFlow".
- **FR-10 (Fase 3): Admin Health Monitoring** — dashboard status sistem, status Plaid API, statistik user dasar.

---

## 4. Non-Functional Requirements

Mengacu ke PRD.md dengan penyesuaian skala solo-project di tahap awal:

| Kategori | Requirement MVP | Catatan |
|---|---|---|
| Performance | FCP < 2s, API p95 < 300ms | Target PRD (1.5s/200ms) tetap aspirational untuk fase scaling |
| Security | Auth0 (OAuth2/JWT), data sensitif dienkripsi di D1, TLS wajib | Tidak berubah dari PRD |
| Availability | Best-effort di MVP (tanpa SLA formal) | 99.9% uptime jadi target mulai fase publik/growth |
| Skalabilitas | Cukup untuk puluhan-ratusan user awal | Re-evaluasi arsitektur saat mendekati ribuan MAU |
| Data Durability | Backup manual/berkala di awal | Automated daily backup jadi requirement sebelum fase publik |

---

## 5. Out of Scope (semua fase, sesuai PRD.md)

- Shared/multi-user budgets.
- Investment, loan, mortgage tracking.
- AI-driven financial advice/forecasting otomatis.
- Bill payment reminders/scheduling.
- Multi-currency.
- Native mobile app (iOS/Android) — web responsive saja.

---

## 6. Open Questions untuk Ditindaklanjuti Saat Development

- Formula pasti "Financial Health Score" — perlu difinalisasi sebelum implementasi FR-04.
- Daftar final achievement dan kriteria unlock-nya.
- Kebijakan retensi/penghapusan receipt image saat akun dihapus.
