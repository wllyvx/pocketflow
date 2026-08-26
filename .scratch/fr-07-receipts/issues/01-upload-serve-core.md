# 01: Upload & serve inti receipt

**What to build:** Alur end-to-end paling sempit untuk penyimpanan struk: binding bucket R2 diaktifkan pada konfigurasi Worker (development memakai simulasi R2 lokal wrangler). File yang diunggah melalui endpoint receipts divalidasi server-side (allowlist Content-Type JPEG/PNG, pengecekan ukuran maksimal 5MB, magic-byte sniffing), lalu disimpan ke R2 dengan object key per-user (prefix user + UUID + ekstensi). File dapat diambil kembali melalui endpoint proxy terautentikasi yang memverifikasi ownership dan merespons binary dengan Content-Type sesuai serta `Cache-Control: private`. Semua logika hidup di satu modul service receipt; route hanya wiring auth.

**Blocked by:** None (can start immediately)

**Status:** ready-for-human

- [x] Binding `RECEIPTS_BUCKET` aktif dan berfungsi dengan simulasi lokal wrangler
- [x] Upload JPEG/PNG ≤5MB berhasil tersimpan dengan key per-user
- [x] File non-JPEG/PNG, file >5MB, atau file dengan magic-byte tidak cocok ditolak dengan error berkode jelas
- [x] Get via proxy hanya berhasil untuk pemilik file; user lain mendapat error otorisasi
- [x] Response proxy menyertakan Content-Type benar dan header `Cache-Control: private`
- [x] Test service lulus dengan in-memory fake bucket (upload valid/invalid, serve, ownership)
