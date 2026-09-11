## Rincian tahap pertama

### Dashboard dan unit PlayStation
- Perluas status menjadi **Tersedia, Booking, Bermain, Maintenance, Offline** dengan warna sesuai spesifikasi.
- Sediakan pengaturan nama unit, jenis PS, booth, harga reguler/member, dan status operasional.
- Tambahkan ringkasan pendapatan hari ini, rental aktif, unit tersedia, booking, pelanggan, dan stok menipis sebagai kartu siap-data.

### Rental dan paket
- Form sesi memuat pelanggan, nomor HP, member/non-member, paket, waktu mulai, harga, dan catatan.
- Pengaturan paket mencakup nama, durasi, harga, jadwal berlaku, dan aktif/nonaktif.
- Aturan pembulatan biaya dapat dipilih per menit, 30 menit, atau jam dengan pembulatan ke atas.

### POS dan pembayaran
- Pisahkan layar POS produk dengan pencarian, kategori, keranjang, jumlah, catatan, diskon, pajak, dan service charge.
- Tetap dukung transaksi gabungan rental + makanan/minuman.
- Pembayaran menampilkan status, metode, uang diterima, dan kembalian; metode yang sudah dapat dikonfigurasi tetap digunakan.
- Buat struk berisi identitas transaksi dan aksi cetak, unduh PDF, serta bagikan.

### Laporan awal
- Tambahkan filter periode, grafik pendapatan/transaksi, metode pembayaran, produk terlaris, dan unit paling sering digunakan.
- Ekspor CSV tersedia pada tahap antarmuka; PDF laporan mengikuti setelah struk stabil.

## Teknis
- Tetap menggunakan TanStack Start, React, dan komponen desain yang sudah tersedia.
- State draft dimigrasikan secara defensif agar data lokal versi lama tidak rusak saat struktur baru ditambahkan.
- Setiap bagian utama mendapat halaman tersendiri; navigasi desktop dan ponsel dibuat ringkas.
- Data contoh dipakai hanya untuk mendemonstrasikan UI baru. Tidak ada login, sinkronisasi, atau database palsu.
- Setelah Cloud diaktifkan, struktur data lokal dipindahkan ke tabel relasional dengan role terpisah dan aturan akses server.

## Batasan draft
- Data hanya tersimpan pada browser/perangkat yang sama dan dapat hilang jika penyimpanan browser dibersihkan.
- APK Android, login multi-pengguna, push notification, dan sinkronisasi real-time belum dapat dibuat dalam draft ini; tampilan web tetap dioptimalkan untuk ponsel agar siap dijadikan aplikasi setelah fondasi cloud tersedia.
