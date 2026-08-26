# 04: Cleanup receipt saat hapus transaksi

**What to build:** Dari perspektif user: ketika ia menghapus transaksi yang memiliki struk, fotostruknya juga hilang dari storage — tidak ada sisa file yatim. Service transaksi memanggil fungsi delete dari service receipt menggunakan fake bucket yang sama pada test.

**Blocked by:** 01

**Status:** done

- [x] Hapus transaksi berikut struknya menghapus objek R2 terkait
- [x] Hapus transaksi tanpa struk tetap berjalan normal tanpa efek samping storage
- [x] Verifikasi lewat test service dengan fake bucket yang sama dengan ticket 01
