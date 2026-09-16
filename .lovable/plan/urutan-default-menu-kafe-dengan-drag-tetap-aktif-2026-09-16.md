# Urutan Default Menu Kafe dengan Drag Tetap Aktif

## Perubahan
- Saat membuka **Setup → Kafe**, tabel **Menu Makanan & Minuman** otomatis disusun berdasarkan:
  1. **Kategori** (A–Z)
  2. **Nama Menu** (A–Z) di dalam setiap kategori
- Pengurutan otomatis hanya menjadi susunan awal. Setelah pengguna menggeser baris, susunan manual baru disimpan dan langsung dipertahankan.
- Tombol geser di sisi kiri tetap tampil dan aktif selama tabel digunakan.
- Judul kolom pada tabel Menu Makanan & Minuman tidak lagi dipakai untuk mengurutkan, sehingga tidak ada kondisi yang menyembunyikan tombol geser.
- Perilaku tabel lain, termasuk Pengaturan Unit TV, tidak diubah.

## Teknis
- Tambahkan cara menyimpan urutan ID menu secara utuh agar perpindahan pertama berasal dari susunan Kategori → Nama Menu yang sedang terlihat, bukan dari urutan lama di penyimpanan.
- Terapkan urutan awal satu kali ketika halaman Kafe dibuka; perpindahan berikutnya memakai urutan manual tersimpan.
- Pertahankan data menu, detail, harga, kategori, printer, modifier, dan fungsi hapus tanpa perubahan.

## Verifikasi
- Buka halaman Kafe dan pastikan urutan awal mengikuti Kategori lalu Nama Menu.
- Geser satu menu ke posisi lain dan pastikan tombol geser tidak hilang serta posisi baru bertahan.
- Buka panel detail dan pastikan seluruh pengaturan menu tetap berfungsi.
