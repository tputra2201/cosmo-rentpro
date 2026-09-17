# Konfirmasi untuk Hapus dan Simpan

Tujuan: tidak ada data yang hilang atau berubah karena salah pencet.

## Yang akan berubah

1. **Semua tombol Hapus di halaman Setup dan Playing Card**
   (menu kafe, kategori, unit TV, konsol, paket, tarif, promo, pembayaran, printer,
   pengguna, membership, kategori & item kas, kartu)
   Ikon tong sampah tidak langsung menghapus. Muncul kotak konfirmasi:
   "Hapus <nama item>? Data ini tidak bisa dikembalikan." dengan tombol Batal dan Hapus.

2. **Tombol Simpan di panel detail**
   Setelah menekan Simpan muncul kotak "Simpan perubahan?" dengan Batal dan Simpan.
   Berlaku untuk panel detail di seluruh halaman Setup dan Playing Card.

3. **Hapus pesanan kafe dan hapus additional rental di panel TV / meja**
   Diberi konfirmasi yang menyebut nama pesanan atau nama item sebelum dihapus.
   Penghapusan additional rental juga mulai dicatat di Log Book (sekarang belum tercatat).

4. **Hapus riwayat transaksi di menu Reports**
   - Tombol "Hapus riwayat" hanya terlihat untuk level Manager, Installer, dan Developer.
     Kasir, Finance, dan Operator tidak melihat tombol ini.
   - Tombol tetap memakai konfirmasi tegas: pengguna harus mengetik kata `HAPUS`
     sebelum tombol aktif, karena efeknya menghapus seluruh riwayat nota.
   - Penghapusan dicatat di Log Book beserta nama dan level pelakunya.

5. **Hapus nota tunggal di Reports** sudah punya konfirmasi, dibiarkan seperti sekarang.

## Catatan teknis

- Tambah komponen bersama `src/components/ConfirmDialog.tsx` (berbasis AlertDialog)
  dengan opsi `requireTypedWord` untuk aksi berbahaya.
- `src/components/SetupTable.tsx`: `onRemove` dibungkus konfirmasi internal
  (prop opsional `removeConfirmText`), sehingga semua halaman Setup ikut berubah
  tanpa mengubah masing-masing halaman. Panel detail mendapat pembungkus
  konfirmasi untuk tombol Simpan lewat helper `useConfirm()`.
- `src/routes/_authenticated/laporan.tsx`: tombol "Hapus riwayat" dibungkus
  pemeriksaan level (`installer | manager | admin`, mengikuti pola privileged
  yang sudah dipakai di halaman Store) dan `ConfirmDialog` bertipe typed-word,
  lalu `addLog("Hapus seluruh riwayat transaksi", …)`.
- `src/components/StationDialog.tsx` dan `src/components/CafeTables.tsx`:
  konfirmasi hapus pesanan dan hapus baris additional rental, plus `addLog`
  untuk penghapusan additional rental.
- Tidak ada perubahan skema database.
