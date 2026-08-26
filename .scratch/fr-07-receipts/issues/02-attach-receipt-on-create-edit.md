# 02: Lampirkan receipt saat tambah/edit transaksi

**What to build:** Dari perspektif user: saat menambah atau mengedit transaksi di panel transaksi, ia bisa memilih gambar struk. Client memvalidasi tipe dan ukuran sebelum request dikirim (penolakan instan dengan pesan jelas). Alurnya upload-first: unggah dulu ke endpoint receipts, dapat URL proxy, lalu sertakan referensinya pada payload create/edit transaksi. Jika koneksi gagal saat upload, data transaksi tidak tersentuh dan upload bisa diulang. Saat edit mengganti receipt, objek lama dihapus dari storage; saat edit mengosongkan receipt, objek juga dihapus.

**Blocked by:** 01

**Status:** done

- [x] User dapat melampirkan struk saat menambah transaksi; transaksi tersimpan dengan referensi struk
- [x] User dapat mengganti struk saat edit; objek lama terhapus dari storage
- [x] Edit yang mengosongkan receipt menghapus objek dari storage dan mereset referensi
- [x] Tipe file tidak didukung / ukuran >5MB ditolak di sisi client sebelum request dikirim
- [x] Kegagalan network saat upload tidak merusak transaksi; upload dapat di-retry
- [x] Skema Zod validasi upload didefinisikan/reused dari packages/shared
