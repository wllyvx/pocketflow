# ROADMAP.md: PocketFlow

Roadmap ini berbasis **fase**, bukan tanggal kalender kaku (belum ada target waktu pasti). Setiap fase punya estimasi durasi kasar untuk konteks solo developer + AI coding agent — dianggap sebagai *guardrail*, bukan komitmen keras. Urutan dalam fase dirancang agar setiap tahap menghasilkan sesuatu yang bisa dites/dijalankan (bukan menunggu semuanya selesai baru bisa dicoba).

## Fase 0 — Fondasi Proyek (~1 minggu)

Tujuan: repo siap, environment jalan, deploy pipeline paling sederhana sudah tervalidasi sebelum menulis fitur apapun.

- [ ] Setup monorepo (pnpm workspace: `apps/web`, `apps/api`, `packages/shared`) sesuai ARCHITECTURE.md.
- [ ] Setup Cloudflare account, D1 database, R2 bucket, `wrangler.toml`.
- [ ] Setup Auth0 tenant (application + API), integrasi login dasar (redirect flow) tanpa fitur lain.
- [ ] Deploy "Hello World" end-to-end: Astro page yang memanggil satu endpoint Hono terproteksi JWT.
- [ ] Setup Drizzle ORM + migration awal untuk skema di DATABASE.md (User, Account, Category, Envelope, Transaction).

**Definition of Done:** bisa login lewat Auth0, dan setelah login, frontend berhasil memanggil API yang mengembalikan data dari D1.

## Fase 1 — MVP Inti (~4-6 minggu)

Tujuan: aplikasi yang benar-benar bisa dipakai untuk mencatat keuangan manual sehari-hari.

**1a. Data & Envelope**
- [ ] CRUD Envelope (FR-03) + endpoint API sesuai API.md.
- [ ] Logika fill envelope & transfer antar-envelope.
- [ ] Halaman "Kelola Envelope" (lihat USER_FLOW.md §4).

**1b. Transaksi Manual**
- [ ] CRUD Transaksi manual (FR-02) — income/expense/transfer.
- [ ] Upload receipt ke R2 (FR-07), attach ke transaksi.
- [ ] Halaman daftar & form tambah/edit transaksi (USER_FLOW.md §3).

**1c. Dashboard**
- [ ] "Available to Spend" + progress bar envelope dengan color-coding (FR-04).
- [ ] Financial Health Score — finalisasi formula (lihat Open Question di REQUIREMENTS.md) lalu implementasi.
- [ ] Empty states untuk user baru.

**1d. Insights**
- [ ] Chart spending by category, income vs expense trend (FR-06).
- [ ] Filter rentang tanggal.

**1e. Achievements (dasar)**
- [ ] Finalisasi daftar achievement MVP + kriteria.
- [ ] Achievement engine sederhana (event-triggered check).
- [ ] Halaman "My Achievements" + notifikasi unlock.

**1f. Onboarding**
- [ ] Flow registrasi/login lengkap + onboarding envelope starter (skippable) — USER_FLOW.md §2.

**Definition of Done (Fase 1):** seorang user baru bisa daftar, membuat envelope, mencatat transaksi harian dengan receipt, melihat progress di dashboard, mendapat achievement pertama, dan melihat insight pengeluaran — tanpa bug blocking.

## Fase 2 — Otomatisasi & Sinkronisasi Bank (~3-5 minggu)

Tujuan: mengurangi effort manual dengan integrasi Plaid.

- [ ] Plaid Link di onboarding & halaman "Tambah Akun Bank" (FR-01 lanjutan).
- [ ] Sinkronisasi transaksi otomatis dari Plaid (FR-08).
- [ ] UI kategorisasi transaksi yang belum ter-assign ke envelope.
- [ ] Deteksi & penanganan duplikat transaksi (edge case dari FEATURES.md §3).
- [ ] Manual refresh sync per akun.
- [ ] Net Worth calculation di Insights diperbarui memakai saldo real dari Plaid (bukan estimasi manual saja).

**Definition of Done:** user dapat menghubungkan rekening bank, transaksi baru masuk otomatis, dan alur kategorisasi transaksi baru terasa cepat (bukan beban).

## Fase 3 — Monetisasi & Operasional (~2-3 minggu)

Tujuan: siap untuk digunakan publik secara berkelanjutan.

- [ ] Voluntary Donation Support (FR-09) — integrasi payment gateway, halaman "Support PocketFlow".
- [ ] Admin System Health Monitoring (FR-10) — status Plaid API, statistik user dasar, dashboard admin terproteksi.
- [ ] Automated daily backup untuk D1 (NFR dari PRD.md).
- [ ] Observability dasar: error tracking (mis. Sentry), structured logging.
- [ ] Review keamanan menyeluruh (rate limiting, scoping data per user, validasi upload) sebelum dianggap production-ready untuk user publik.

**Definition of Done:** aplikasi punya visibilitas operasional dasar dan jalur monetisasi opsional aktif, cukup layak untuk mulai mengundang user di luar lingkaran dekat.

## Fase 4 — Iterasi Berdasarkan Feedback (ongoing)

Tidak terikat scope tetap — diarahkan oleh data pemakaian nyata & feedback user, contoh kandidat:

- Penyempurnaan formula Financial Health Score berdasarkan perilaku user riil.
- Achievement tambahan / gamifikasi lebih dalam.
- Optimasi performa (FCP, API p95) mendekati target agresif di PRD.md.
- Eksplorasi fitur "Out of Scope" di PRD.md (mis. shared budget) jika ada demand jelas.

---

## Cara Menggunakan Roadmap Ini dengan AI Coding Agent

- Kerjakan satu checklist item (atau kelompok kecil yang berkaitan) per sesi kerja dengan AI agent — hindari meminta seluruh fase sekaligus agar hasil mudah direview.
- Setiap kali sebuah item selesai, update REQUIREMENTS.md/ARCHITECTURE.md jika ada keputusan baru yang menyimpang dari rencana awal (mis. formula Financial Health Score final), supaya dokumen tetap jadi source of truth yang akurat untuk sesi berikutnya.
- Fase 0 dan awal Fase 1 (Envelope + Transaksi) adalah fondasi — prioritaskan kualitas & test di sini karena semua fitur lain bergantung padanya.
