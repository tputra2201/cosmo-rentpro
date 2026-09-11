# Tahap 2 — Booking dan relasi pelanggan

## Hasil yang dibangun
- **Booking:** tampilan kalender/agenda, tambah dan ubah booking, status booking, serta pencegahan bentrok unit pada jam yang sama.
- **Pelanggan & member:** daftar pelanggan, pencarian, profil ringkas, status member, level, total kunjungan, dan saldo poin.
- **Poin:** aturan perolehan poin yang dapat diatur, pencatatan poin dari transaksi, dan penyesuaian manual dengan riwayat alasan.
- **Promo:** promo diskon nominal/persentase dengan periode berlaku, minimal transaksi, batas diskon, status aktif, dan simulasi hasil diskon.
- **Integrasi operasional:** booking dapat diteruskan menjadi sesi TV, pelanggan dapat dipilih saat memulai rental, dan transaksi member memperbarui kunjungan serta poin.

## Batasan tahap ini
Semua data masih tersimpan pada perangkat yang sama. Sinkronisasi, login multi-pengguna, dan pemesanan pelanggan dari perangkat lain menunggu Cloud di proyek utama.

## Urutan pengerjaan
1. Perluas penyimpanan lokal secara aman untuk booking, pelanggan, mutasi poin, promo, dan aturan poin.
2. Buat halaman Booking, Pelanggan, dan Promo beserta navigasi desktop/ponsel.
3. Hubungkan data pelanggan dan booking ke alur mulai sesi.
4. Hubungkan transaksi selesai ke statistik pelanggan dan poin.
5. Uji bentrok booking, alur member, promo, tampilan desktop, dan tampilan ponsel.
