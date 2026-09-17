# Additional Rental dengan durasi sendiri

## Masalah

Sekarang additional rental yang dihitung per jam selalu mengikuti lama sesi TV. Kalau pelanggan sewa VIP Room 3 jam tapi Nintendo Switch hanya 1 jam, tagihan Switch tetap terhitung 3 jam.

## Yang akan dibuat

- Saat kasir menambahkan additional rental yang harganya per jam, ada kolom **Durasi (menit)** di samping pilihan barangnya.
  - Diisi, misal 60 → Switch dihitung tepat 1 jam walau sesi TV 3 jam.
  - Dibiarkan kosong → tetap mengikuti lama sesi TV seperti sekarang (perilaku lama tidak berubah).
- Durasi bisa diubah lagi dari daftar additional rental di panel TV, dan barisnya menampilkan keterangan durasinya, misal `Nintendo Switch × 1 · 1 jam` atau `· ikut sesi`.
- Additional rental jenis "sekali sewa" tidak berubah — tidak ada kolom durasi.
- Nilai tagihan, potongan harga khusus item, Cetak Bill, struk, dan laporan (Company Report, per kasir, per perangkat) semuanya memakai durasi yang dipakai barang itu, bukan durasi sesi.

## Catatan teknis

- `SessionAddon` mendapat field opsional `minutes?: number`. `addonAmount(addon, hours)` memakai `addon.minutes / 60` bila ada, jika tidak pakai `hours` sesi. Karena field opsional, data sesi & riwayat lama tetap terbaca apa adanya.
- `addonDiscountTotal` memakai jam efektif yang sama untuk menghitung `units`, jadi diskon per jam ikut benar.
- `addSessionAddon(stationId, addonId, qty, minutes?)` dan fungsi baru `updateSessionAddon(stationId, rowId, patch)` untuk mengubah durasi; keduanya lewat `withLog` seperti fungsi sesi lain.
- `StationDialog.tsx`: state `addonMinutes` di samping `addonPick`; input angka hanya tampil saat item terpilih bermode `hourly`; baris daftar addon mendapat input durasi kecil.
- `print-docs.ts` dan `CompanyReport.tsx` sudah memanggil `addonAmount`, jadi otomatis ikut benar tanpa perubahan logika tambahan.
- Tanpa perubahan skema database.
