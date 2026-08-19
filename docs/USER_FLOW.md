# USER_FLOW.md: PocketFlow

Dokumen ini mendeskripsikan alur pengguna (user flow) untuk fitur-fitur MVP, dilengkapi wireframe kasar (low-fidelity, berbasis teks) karena belum ada desain visual final. Acuan visual detail tetap merujuk ke DESIGN.md (warna, tipografi, spacing).

## 1. Peta Navigasi Utama

```mermaid
flowchart LR
    Login[Login/Register] --> Onboarding[Onboarding Singkat]
    Onboarding --> Dashboard
    Login -->|user lama| Dashboard
    Dashboard --> Transactions[Daftar Transaksi]
    Dashboard --> Envelopes[Kelola Envelope]
    Dashboard --> Insights[Insights & Reports]
    Dashboard --> Achievements[My Achievements]
    Transactions --> AddTx[Tambah/Edit Transaksi]
    Envelopes --> AddEnv[Tambah/Edit Envelope]
    Dashboard --> Settings[Pengaturan]
```

Bottom navigation (mobile-first, mengacu spacing 4px grid di DESIGN.md): **Dashboard · Transaksi · Envelope · Insights**. "Achievements" dan "Settings" diakses dari ikon profil/header.

---

## 2. Flow: Onboarding & Registrasi (FR-01)

```mermaid
flowchart TD
    A[Landing Page] --> B{Punya akun?}
    B -->|Tidak| C[Register: Email/Password atau Google/Apple]
    B -->|Ya| D[Login]
    C --> E[Verifikasi via Auth0]
    D --> E
    E --> F{User baru?}
    F -->|Ya| G[Onboarding: buat 3-5 envelope starter - opsional/skip]
    F -->|Tidak| H[Dashboard]
    G --> H
```

**Wireframe kasar — Onboarding Envelope Starter:**
```
┌─────────────────────────────┐
│  Selamat datang! 👋          │
│  Mari mulai dengan envelope  │
│  dasar (bisa diubah nanti)   │
│                              │
│  [x] Groceries    Rp 0       │
│  [x] Transport    Rp 0       │
│  [x] Fun          Rp 0       │
│  [ ] + Tambah envelope lain  │
│                              │
│  [ Lewati ]     [ Lanjut ]  │
└─────────────────────────────┘
```

**Edge case yang ditangani UI:** tombol "Lewati" selalu tersedia agar user tidak terjebak di onboarding (sesuai edge case FEATURES.md: user membatalkan proses).

---

## 3. Flow: Tambah Transaksi Manual (FR-02)

```mermaid
flowchart TD
    A[Dashboard / Daftar Transaksi] --> B[Tap tombol + Tambah Transaksi]
    B --> C[Pilih tipe: Income / Expense / Transfer]
    C --> D[Isi amount, tanggal, envelope, note]
    D --> E{Lampirkan receipt?}
    E -->|Ya| F[Upload gambar]
    E -->|Tidak| G[Simpan]
    F --> G
    G --> H{Amount valid & envelope cukup?}
    H -->|Overspend| I[Simpan + tampilkan warning over-budget]
    H -->|Normal| J[Simpan + update saldo envelope]
    I --> K[Kembali ke Dashboard, envelope tampil merah]
    J --> K
```

**Wireframe kasar — Form Tambah Transaksi:**
```
┌─────────────────────────────┐
│  ← Tambah Transaksi          │
│                              │
│  ( Income )( Expense )(Transfer) │
│                              │
│  Jumlah:      [ Rp _______ ] │
│  Tanggal:     [ 10 Aug 2026 ]│
│  Envelope:    [ Groceries ▾ ]│
│  Catatan:     [___________ ] │
│  Receipt:     [ 📎 Upload  ] │
│                              │
│         [ Simpan Transaksi ] │
└─────────────────────────────┘
```

---

## 4. Flow: Kelola Envelope (FR-03)

```mermaid
flowchart TD
    A[Halaman Envelope] --> B[Lihat daftar envelope + saldo]
    B --> C{Aksi}
    C -->|Buat baru| D[Nama, budget amount, reset frequency]
    C -->|Isi dana| E[Pilih sumber: Available to Spend]
    C -->|Pindah dana| F[Pilih envelope tujuan + jumlah]
    C -->|Hapus| G{Saldo = 0?}
    G -->|Ya| H[Hapus langsung]
    G -->|Tidak| I[Pilih: pindahkan sisa dana / kembalikan ke Available to Spend]
    D --> B
    E --> B
    F --> B
    H --> B
    I --> B
```

**Wireframe kasar — Kartu Envelope (dipakai di Dashboard & halaman Envelope):**
```
┌─────────────────────────────┐
│ 🛒 Groceries                 │
│ ████████░░░░  Rp 380 / 500   │
│ (hijau→kuning saat >70%)     │
└─────────────────────────────┘
```

---

## 5. Flow: Dashboard (FR-04)

**Wireframe kasar:**
```
┌─────────────────────────────┐
│ Available to Spend           │
│        Rp 1.250.000          │
│                              │
│ Financial Health   [ 78/100 ]│
│ ● ● ● ● ○  (ring visual)     │
│                              │
│ Envelope Progress             │
│ [Groceries card] [Fun card]  │
│ [Transport card] [+ Baru]    │
│                              │
│ Transaksi Terbaru             │
│ - Kopi pagi      -Rp 25.000  │
│ - Gaji bulanan  +Rp2.000.000 │
│                              │
│ [Dashboard][Tx][Env][Insight]│
└─────────────────────────────┘
```

**Empty state (user baru, belum ada envelope/transaksi):**
```
┌─────────────────────────────┐
│ Available to Spend Rp 0      │
│                              │
│ Belum ada envelope.          │
│ [ + Buat Envelope Pertama ] │
└─────────────────────────────┘
```

---

## 6. Flow: Insights & Reporting (FR-06)

```mermaid
flowchart TD
    A[Halaman Insights] --> B[Pilih rentang tanggal]
    B --> C[Tab: Spending by Category]
    B --> D[Tab: Income vs Expense]
    B --> E[Tab: Net Worth]
    C --> F{Ada data?}
    D --> F
    E --> F
    F -->|Tidak| G[Empty state + saran tambah transaksi]
    F -->|Ya| H[Render chart]
```

---

## 7. Flow: Achievements (FR-05)

```mermaid
flowchart TD
    A[User melakukan aksi: tambah transaksi/envelope/dsb] --> B[Sistem evaluasi kriteria achievement]
    B --> C{Kriteria terpenuhi?}
    C -->|Ya| D[Unlock achievement + notifikasi in-app]
    C -->|Tidak| E[Tidak ada perubahan]
    D --> F[Tampil di halaman My Achievements]
```

**Wireframe kasar — Notifikasi Unlock:**
```
┌─────────────────────────────┐
│  🏆 Achievement Terbuka!      │
│  "First Envelope Created"    │
│         [ Lihat Semua ]      │
└─────────────────────────────┘
```

---

## 8. Prinsip UX Lintas Flow

- Sesuai DESIGN.md goal #2: setiap aksi inti (tambah transaksi, isi envelope) harus dapat diselesaikan dalam **≤ 3 tap/klik** dari Dashboard.
- Semua form kritikal (tambah transaksi, buat envelope) memiliki validasi inline (bukan hanya setelah submit).
- Semua state kosong (empty state) harus punya call-to-action yang jelas, tidak boleh layar kosong tanpa arahan.
- Warna status (hijau/kuning/merah) dari DESIGN.md dipakai konsisten di semua tempat yang menampilkan progress envelope (Dashboard, halaman Envelope, notifikasi).
