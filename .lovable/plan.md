# Aplikasi Android dengan cetak Bluetooth langsung

## Hasil
- Sediakan aplikasi Android khusus Billing Rental PS yang membuka aplikasi dan data store yang sama.
- Hilangkan ketergantungan pada RawBT untuk penggunaan melalui aplikasi Android khusus.
- Cetak langsung ke Kassen MT-300 VL 80 mm melalui Bluetooth Classic ESC/POS.

## Pekerjaan
1. Tambahkan proyek Android kecil sebagai pembungkus resmi aplikasi.
2. Batasi pembungkus agar hanya membuka alamat resmi Billing Rental PS dan tetap memakai login yang sekarang.
3. Tambahkan pilihan printer dari perangkat Bluetooth yang sudah dipasangkan di Android.
4. Tambahkan penghubung cetak aman dari halaman web ke aplikasi Android:
   - struk, invoice, label, dan laporan mengirim teks ESC/POS langsung;
   - koneksi memakai profil Bluetooth serial printer;
   - tampilkan hasil berhasil atau pesan kegagalan yang jelas.
5. Ubah menu Printer:
   - tambahkan pilihan **Aplikasi Android — Bluetooth langsung**;
   - simpan printer Bluetooth yang dipilih;
   - pertahankan dialog cetak untuk komputer;
   - hapus petunjuk RawBT yang membingungkan dari alur utama.
6. Tambahkan izin Bluetooth Android modern dan penanganan untuk Android versi lama.
7. Dokumentasikan cara menghasilkan dan memasang APK melalui Android Studio, termasuk memasangkan Kassen terlebih dahulu.
8. Uji kompilasi bagian web, pemeriksaan sumber Android yang tersedia, serta perilaku cadangan jika halaman dibuka di browser biasa.

## Catatan teknis
- Printer harus dipasangkan sekali melalui Pengaturan Bluetooth Android; setelah itu aplikasi menghubungkannya langsung tanpa RawBT.
- Koneksi memakai Bluetooth Classic SPP dengan UUID serial standar dan byte ESC/POS.
- APK tidak dapat diterbitkan dari pratinjau web. Proyek Android yang dihasilkan perlu dibuka dan dibangun sekali di Android Studio.
- Karena aplikasi menampilkan versi online yang sama, pembaruan halaman dan data tidak memerlukan pemasangan APK baru kecuali bagian pencetakan Android berubah.
