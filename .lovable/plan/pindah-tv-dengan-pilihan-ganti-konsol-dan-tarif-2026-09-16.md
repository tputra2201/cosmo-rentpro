# Pindah TV dengan Pilihan Ganti Konsol dan Tarif

Saat kasir memakai **Pindah TV**, selain memilih unit tujuan, kasir juga bisa memilih jenis konsol dari daftar konsol yang ada. Jika konsol diganti, tarif per jam sesi otomatis mengikuti harga konsol baru; jika tidak diganti, tarif tetap seperti awal sesi.

## Perubahan

1. **Panel Pindah TV (StationDialog.tsx)**
   - Di blok pindah unit ditambahkan pilihan "Ganti konsol" (dropdown berisi semua jenis konsol yang terdaftar di Setup Price, dengan tarif per jamnya terlihat).
   - Default-nya konsol saat ini; kasir hanya mengubah bila ingin tarif baru.

2. **Logika pindah (billing-store.tsx)**
   - `moveSession` menerima parameter opsional konsol baru; bila diisi, `session.console` dan `session.rate` diperbarui ke tarif konsol tersebut (mengikuti data tarif yang ada di Pricing).
   - Semua data lain (waktu, pesanan, pembayaran, member, diskon) tetap terbawa.

3. **Log Book**
   - Catatan "Pindah unit TV" dilengkapi info konsol bila berubah, misal: `TV 2 → TV 5 (PS4 → PS5)`.

## Catatan teknis
- Tanpa perubahan database — konsol & tarif sesi sudah tersimpan di data sesi.
- Pindah meja kafe tidak terpengaruh (meja tidak punya tarif).
