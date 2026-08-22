# PocketFlow

PocketFlow adalah aplikasi budgeting pribadi berbasis envelope untuk membantu pengguna mencatat transaksi, mengatur anggaran, dan memantau kesehatan keuangan.

## Project Overview

PocketFlow menggunakan monorepo dengan struktur:

- `apps/web`: frontend Astro.js
- `apps/api`: backend Hono pada Cloudflare Workers
- `packages/shared`: tipe dan schema validasi bersama

Teknologi utama:

- Astro.js
- Hono
- TypeScript
- Drizzle ORM
- Cloudflare D1
- Cloudflare R2
- Auth0
- pnpm workspaces

Fitur MVP:

- Auth dan onboarding
- Pencatatan transaksi manual
- Envelope budgeting
- Dashboard keuangan
- Achievements dan rewards
- Financial insights
- Lampiran receipt

Sinkronisasi rekening bank dengan Plaid, donasi, dan admin monitoring direncanakan untuk fase berikutnya.

## Prasyarat

Install terlebih dahulu:

- Node.js LTS
- Git
- Corepack
- Akun Auth0
- Akun Cloudflare untuk D1

Pastikan tool tersedia:

```powershell
node --version
corepack --version
git --version
```

## Clone Repository

Ganti URL berikut dengan URL repository yang sebenarnya:

```powershell
git clone <REPOSITORY_URL>
cd Pocketflow
```

Aktifkan pnpm dan install dependency:

```powershell
corepack enable
corepack pnpm install
```

## Konfigurasi Environment

Buat environment frontend:

```powershell
Copy-Item apps\web\.env.example apps\web\.env
```

Isi `.env`:

```env
PUBLIC_API_URL=http://localhost:8787
PUBLIC_AUTH0_DOMAIN=your-tenant.us.auth0.com
PUBLIC_AUTH0_CLIENT_ID=your-auth0-application-client-id
PUBLIC_AUTH0_AUDIENCE=https://api.pocketflow.app
```

Buat `.dev.vars`:

```env
DEV_AUTH_TOKEN=local-dev-token
AUTH0_DOMAIN=your-tenant.us.auth0.com
AUTH0_AUDIENCE=https://api.pocketflow.app
```

Jangan commit file `.env` atau `.dev.vars`.

## Konfigurasi Auth0

Buat di Auth0:

1. Single Page Application untuk frontend.
2. API dengan identifier `https://api.pocketflow.app`.
3. Signing algorithm `RS256`.
4. Izinkan aplikasi frontend mengakses API.

Untuk development, gunakan URL berikut:

```text
http://localhost:4321
```

Tambahkan URL tersebut ke:

- Allowed Callback URLs
- Allowed Logout URLs
- Allowed Web Origins

## Konfigurasi Database Lokal

Pastikan `wrangler.toml` menggunakan D1 database yang benar.

Jalankan migrasi lokal:

```powershell
corepack pnpm db:migrate:local
```

Jika membuat database baru di Cloudflare:

```powershell
corepack pnpm --filter @pocketflow/api exec wrangler login
corepack pnpm --filter @pocketflow/api exec wrangler d1 create pocketflow-db
```

Salin `database_id` hasil command ke `wrangler.toml`.

## Menjalankan Aplikasi

Jalankan API di terminal pertama:

```powershell
corepack pnpm dev:api
```

API tersedia di:

```text
http://localhost:8787
```

Jalankan frontend di terminal kedua:

```powershell
corepack pnpm dev:web
```

Frontend biasanya tersedia di:

```text
http://localhost:4321
```

## Validasi

Typecheck seluruh workspace:

```powershell
corepack pnpm typecheck
```

Jalankan test API:

```powershell
corepack pnpm test
```

Build seluruh workspace:

```powershell
corepack pnpm build
```

Build frontend saja:

```powershell
corepack pnpm --filter @pocketflow/web build
```

## Deployment API

Pastikan konfigurasi Cloudflare, D1, Auth0, dan environment production sudah benar.

```powershell
corepack pnpm --filter @pocketflow/api exec wrangler deploy
```

## Dokumentasi

Dokumentasi proyek tersedia di folder `docs`:

- `ARCHITECTURE.md`
- `REQUIREMENTS.md`
- `ROADMAP.md`
- `SETUP_TODO.md`
- `API.md`
- `DATABASE.md`

```
