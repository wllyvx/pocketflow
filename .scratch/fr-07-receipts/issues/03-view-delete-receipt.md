# 03: Lihat & hapus receipt dari detail transaksi

**What to build:** Dari perspektif user: detail transaksi yang memiliki struk menampilkan thumbnail/link struk. Mengkliknya membuka modal sederhana berisi gambar dari URL proxy (tanpa library lightbox). Tombol hapus menghapus struk lewat endpoint delete dan mengosongkan referensi di transaksi, tanpa menghapus transaksinya.

**Blocked by:** 01

**Status:** done

- [x] Detail transaksi dengan struk menampilkan thumbnail/link
- [x] Klik membuka modal menampilkan gambar via URL proxy
- [x] Detail transaksi tanpa struk tidak menampilkan elemen struk sama sekali
- [x] Hapus struk menghilangkan objek dari storage dan referensi di transaksi
- [x] Hapus gagal jika mencoba menghapus struk milik user lain (ownership tervalidasi)
