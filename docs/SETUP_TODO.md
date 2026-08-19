# PocketFlow Setup TODO

Checklist ini adalah panduan setup manual dari nol sampai FR-01 dapat diuji di browser.

> Jangan commit file yang berisi secret. File `apps/web/.env` dan `apps/api/.dev.vars` harus tetap lokal.

## 0. Prasyarat Komputer

- [v] Install Node.js LTS dari https://nodejs.org/
- [v] Install Git dari https://git-scm.com/downloads
- [v] Install VS Code dari https://code.visualstudio.com/
- [v] Buka folder repository `D:\PERSONAL\App Development\Pocketflow` di VS Code.
- [v] Buka terminal PowerShell di root repository.
- [v] Pastikan versi tools:

```powershell
node --version
corepack --version
git --version
```

- [v] Aktifkan pnpm melalui Corepack dan install dependency:

```powershell
corepack enable
corepack pnpm install
```

**Selesai jika:** `corepack pnpm install` selesai tanpa error.

## 1. Buat Akun Auth0

- [v] Buka https://auth0.com/ dan pilih **Sign Up** atau **Log In**.
- [v] Buka dashboard Auth0: https://manage.auth0.com/dashboard
- [v] Pilih tenant yang akan digunakan.
- [v] Catat **Domain** tenant. Contoh: `dev-example.us.auth0.com`.

### 1.1 Buat aplikasi frontend

- [v] Buka **Applications > Applications**.
- [v] Klik **Create Application**.
- [v] Isi nama, misalnya `PocketFlow Web`.
- [v] Pilih **Single Page Application**.
- [v] Buka tab **Settings** dan catat **Client ID**.
- [v] Isi URL berikut untuk development:
  - **Allowed Callback URLs:** `http://localhost:4321`
  - **Allowed Logout URLs:** `http://localhost:4321`
  - **Allowed Web Origins:** `http://localhost:4321`
- [v] Klik **Save Changes**.

### 1.2 Buat API untuk audience JWT

- [v] Buka **Applications > APIs**.
- [v] Klik **Create API**.
- [v] Isi nama, misalnya `PocketFlow API`.
- [v] Isi **Identifier**: `https://api.pocketflow.app`
- [v] Pilih signing algorithm **RS256**.
- [v] Klik **Create**.
- [v] Buka **Authentication > Database** pada sidebar Auth0.
- [v] Buka koneksi **Username-Password-Authentication**, pastikan statusnya aktif, lalu klik **Save**.
- [v] Untuk login sosial, buka **Authentication > Social** dan aktifkan Google/Apple jika ingin mengujinya.
- [v] Alternatifnya, buka aplikasi `PocketFlow Web` > tab **Connections**, lalu pastikan koneksi database/sosial yang diperlukan aktif untuk aplikasi tersebut.

### 1.3 Izinkan SPA mengakses API

Error `client not authorized to access resource server` berarti aplikasi SPA belum diberi izin untuk meminta token bagi API PocketFlow. Ini wajib dilakukan meskipun API Auth0 sudah dibuat.

- [v] Di Auth0 Dashboard, buka **Applications > APIs**.
- [v] Pilih API `PocketFlow API` dengan identifier `https://api.pocketflow.app`.
- [v] Buka tab **Application Access**. Pada beberapa tampilan Auth0, bagian ini berada di **Machine to Machine Applications** atau tombol **Add Application**.
- [v] Cari aplikasi `PocketFlow Web` berdasarkan nama atau Client ID.
- [v] Klik **Authorize** atau aktifkan toggle akses untuk aplikasi tersebut.
- [v] Jika Auth0 menampilkan daftar scopes/permissions, izinkan scope yang tersedia atau lanjutkan dengan konfigurasi default.
- [v] Klik **Save** jika tombol tersebut tersedia.
- [v] Pastikan `PUBLIC_AUTH0_AUDIENCE` sama persis dengan **Identifier** API, termasuk `https://` dan tanpa slash di akhir.

**Selesai jika:** Auth0 memiliki satu SPA application, satu API, Client ID tercatat, dan audience API adalah `https://api.pocketflow.app`.

## 2. Konfigurasi Frontend Lokal

- [v] Buat file `apps/web/.env` dengan menyalin `apps/web/.env.example`.

```powershell
Copy-Item apps\web\.env.example apps\web\.env
```

- [v] Buka `apps/web/.env` dan ganti placeholder berikut:

```env
PUBLIC_API_URL=http://localhost:8787
PUBLIC_AUTH0_DOMAIN=domain-tenant-anda.us.auth0.com
PUBLIC_AUTH0_CLIENT_ID=client-id-dari-auth0
PUBLIC_AUTH0_AUDIENCE=https://api.pocketflow.app
```

- [v] Pastikan tidak ada spasi tambahan atau tanda kutip yang tidak diperlukan.
- [v] Jangan memasukkan Client Secret Auth0 ke file frontend. SPA hanya memakai Client ID.

**Selesai jika:** semua `PUBLIC_AUTH0_*` sudah berisi nilai nyata dari Auth0.

## 3. Konfigurasi API Lokal

- [v] Pastikan `apps/api/.dev.vars` berisi token development:

```env
DEV_AUTH_TOKEN=local-dev-token
AUTH0_DOMAIN=domain-tenant-anda.us.auth0.com
AUTH0_AUDIENCE=https://api.pocketflow.app
```

- [v] `AUTH0_DOMAIN` dan `AUTH0_AUDIENCE` harus sama dengan nilai Auth0 di `apps/web/.env`, supaya API lokal dapat memverifikasi JWT.
- [v] Token `DEV_AUTH_TOKEN` dipakai untuk request manual ke API saat development, tetapi flow frontend saat ini menggunakan Auth0.
- [v] Jangan commit perubahan `.dev.vars` jika nantinya berisi secret.

## 4. Siapkan Cloudflare dan D1

Bagian ini diperlukan untuk menyimpan user dan starter envelope saat onboarding.

- [v] Buat akun atau login Cloudflare di https://dash.cloudflare.com/
- [v] Buka dokumentasi D1 jika diperlukan: https://developers.cloudflare.com/d1/
- [v] Login Wrangler dari terminal repository:

```powershell
corepack pnpm --filter @pocketflow/api exec wrangler login
```

- [v] Buat database D1:

```powershell
corepack pnpm --filter @pocketflow/api exec wrangler d1 create pocketflow-db
```

- [v] Dari output command, salin `database_id`.
- [v] Buka `apps/api/wrangler.toml`.
- [v] Ganti:

```toml
database_id = "replace-with-your-d1-database-id"
```

  dengan ID database yang baru dibuat.
- [v] Jalankan migrasi lokal dari root repository:

```powershell
corepack pnpm db:migrate:local
```

- [v] Jika ingin memastikan database remote juga siap, jalankan setelah konfigurasi Cloudflare benar:

```powershell
corepack pnpm --filter @pocketflow/api exec wrangler d1 migrations apply pocketflow-db --remote
```

**Selesai jika:** migration selesai dan tidak ada error binding/database ID. Jika muncul `No migrations to apply!`, migrasi lokal sudah selesai.

## 5. Jalankan Aplikasi Lokal

Buka dua terminal PowerShell di root repository.

### Terminal 1: API

- [v] Jalankan:

```powershell
corepack pnpm dev:api
```

- [v] Pastikan API berjalan di `http://localhost:8787`.
- [v] Tes endpoint health menggunakan PowerShell:

```powershell
Invoke-RestMethod http://localhost:8787/health
```

Expected response memiliki:

```json
{
  "success": true,
  "data": {
    "service": "api",
    "status": "ok"
  }
}
```

### Terminal 2: frontend

- [v] Jalankan:

```powershell
corepack pnpm dev:web
```

- [ ] Buka URL yang ditampilkan Astro, biasanya `http://localhost:4321/` atau `http://localhost:4322/` jika port 4321 sedang digunakan.

**Selesai jika:** halaman PocketFlow tampil dan tidak ada error startup di terminal.

## 6. Uji FR-01 di Browser

- [v] Di URL frontend yang ditampilkan Astro, klik **Log in or sign up**.
- [v] Pastikan browser diarahkan ke Auth0. Jika muncul `invalid request, client not authorized to access resource server`, selesaikan langkah **1.3 Izinkan SPA mengakses API** terlebih dahulu.
- [v] Daftar user baru memakai email/password.
- [v] Jika Auth0 meminta verifikasi email, selesaikan verifikasinya.
- [v] Setelah login, pastikan browser kembali ke URL frontend yang digunakan Astro.
- [v] Pada onboarding, pilih satu sampai lima starter envelope.
- [v] Klik **Continue**.
- [v] Pastikan dashboard tampil.
- [v] Pastikan nama user tampil di topbar.
- [v] Logout/login kembali dan pastikan user lama tidak diminta onboarding lagi.
- [v] Ulangi dengan user baru dan klik **Skip**.
- [v] Pastikan user langsung melihat dashboard kosong tanpa error.

### Pemeriksaan browser jika gagal

- [v] Buka DevTools dengan `F12`.
- [v] Periksa tab **Console**.
- [v] Periksa tab **Network**.
- [v] Request yang diharapkan:
  - `GET http://localhost:8787/api/users/me`
  - `GET http://localhost:8787/api/onboarding`
  - `POST http://localhost:8787/api/onboarding`
- [v] Pastikan request memiliki header `Authorization: Bearer ...`.
- [v] Jika status `401`, cek domain, Client ID, audience, dan Auth0 API.
- [v] Jika status `503`, jalankan migrasi D1 lokal.
- [v] Jika error CORS, pastikan frontend memakai port `4321` atau `4322`, API memakai port `8787`, lalu restart API setelah konfigurasi berubah.

## 7. Jalankan Validasi Kode

- [v] Typecheck seluruh workspace:

```powershell
corepack pnpm typecheck
```

- [v] Jika root typecheck gagal, jalankan package secara terpisah untuk menemukan sumbernya:

```powershell
corepack pnpm --filter @pocketflow/web typecheck
corepack pnpm --filter @pocketflow/api typecheck
```

- [v] Build frontend:

```powershell
corepack pnpm --filter @pocketflow/web build
```

**Selesai jika:** web dan API typecheck bersih, serta build web berhasil.

## 8. Persiapan Deployment Auth0

Sebelum deploy, buka kembali https://manage.auth0.com/dashboard.

- [ ] Tambahkan URL production frontend ke **Allowed Callback URLs**.
- [ ] Tambahkan URL production frontend ke **Allowed Logout URLs**.
- [ ] Tambahkan URL production frontend ke **Allowed Web Origins**.
- [ ] Jangan hapus URL localhost selama development masih digunakan.

Contoh jika frontend production berada di `https://app.pocketflow.app`:

```text
https://app.pocketflow.app
```

## 9. Persiapan Deployment Cloudflare

- [ ] Buka Cloudflare dashboard: https://dash.cloudflare.com/
- [ ] Pastikan account yang aktif memiliki Worker dan D1.
- [ ] Pastikan `apps/api/wrangler.toml` berisi `database_id` yang nyata.
- [ ] Atur variable Worker untuk production:
  - `AUTH0_DOMAIN`: domain tenant Auth0 tanpa path tambahan.
  - `AUTH0_AUDIENCE`: `https://api.pocketflow.app`.
  - `FRONTEND_ORIGIN`: URL frontend production, misalnya `https://app.pocketflow.app`.
- [ ] Untuk referensi variable Wrangler: https://developers.cloudflare.com/workers/configuration/environment-variables/
- [ ] Untuk deployment Worker, baca: https://developers.cloudflare.com/workers/wrangler/commands/#deploy
- [ ] Jalankan deployment hanya setelah database ID dan Auth0 production URL benar:

```powershell
corepack pnpm --filter @pocketflow/api exec wrangler deploy
```

- [ ] Ubah `PUBLIC_API_URL` pada environment frontend menjadi URL API production.
- [ ] Build ulang frontend setelah environment production diisi:

```powershell
corepack pnpm --filter @pocketflow/web build
```

## 10. Definition of Done FR-01

- [v] User baru dapat register dengan email/password.
- [v] User dapat login kembali.
- [v] Auth0 mengembalikan user ke frontend.
- [v] Frontend mengirim JWT ke API.
- [v] API memvalidasi JWT.
- [v] API membuat profile user jika belum ada.
- [v] User dapat memilih starter envelope.
- [v] User dapat melewati onboarding.
- [v] Status onboarding tersimpan di D1.
- [v] User yang sudah selesai tidak mengulang onboarding.
- [v] User dapat melihat dashboard setelah login.
- [v] Tidak ada Auth0 Client Secret di frontend atau repository.
- [v] Verifikasi Auth0 Database Connection: email/password registration, duplicate-email message, login, and forgot-password flow.
- [v] Verifikasi Auth0 Social Connections: Google and Apple login, including callback back to the configured frontend origin.

Kode aplikasi FR-01 dan onboarding D1 sudah tersedia. Dua checklist terakhir tetap memerlukan pengujian di tenant Auth0 dan browser karena provider, database connection, email verification, dan password reset dikonfigurasi di luar repository.
