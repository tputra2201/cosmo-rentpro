# Cosmo RentalPro

Buatkan kode lengkap untuk aplikasi "Billing Rental PS" menggunakan Flutter agar bisa berjalan di Desktop (Windows/Mac) dan Android. 

Aplikasi harus memiliki spesifikasi sebagai berikut:
1. Desain Antarmuka (UI):
- Menggunakan tema Dark Mode modern dengan aksen warna neon (seperti biru elektrik atau hijau gaming).
- Tampilan responsif agar nyaman dibuka di layar PC desktop maupun tablet/HP Android.

2. Fitur Utama:
- Halaman Dashboard: Berisi grid card visual untuk memonitor TV (TV 01, TV 02, dst.). Setiap card menampilkan status (Tersedia/Kosong, Sedang Main, Waktu Habis).
- Sistem Timer & Billing: Tiap TV memiliki fungsi timer hitung mundur. Bisa memilih mode "Bermain per Jam" (Prepaid) atau "Main Sepuasnya" (Postpaid/Open Time). Saat waktu habis, card TV berubah warna menjadi merah dan memicu alarm/pop-up.
- Manajemen Tarif: Pengaturan tarif per jam yang berbeda untuk PS3, PS4, dan PS5.
- Kasir Makanan/Minuman: Tombol untuk menambah pesanan makanan/minuman ke TV yang sedang aktif, nilainya akan otomatis terakumulasi ke total billing TV tersebut.
- Riwayat & Laporan: Halaman sederhana yang mencatat total pendapatan harian dari rental dan penjualan makanan.

Tolong berikan kode struktur folder Flutter yang rapi (Clean Architecture atau BLoC/Provider sederhana) beserta file main.dart dan screen utamanya agar aplikasi ini siap dijalankan.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://cosmo-rentpro.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/f7796085-bc67-492a-9669-7e31cdf0ef88).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```

## Menjalankan di PC lokal (termasuk menu Developer)

Berpindah store lewat akun Developer sekarang berjalan penuh di PC lokal — cukup
berkas `.env` yang sudah ada.

Untuk membuka Pusat Kontrol Developer (`/kontrol`) di PC lokal, buat berkas
`.env.local` di folder proyek (berkas ini tidak ikut ke repositori) dan isi:

```sh
DEVELOPER_CONTROL_SECRET="kunci-rahasia-buatan-sendiri"
SUPABASE_SERVICE_ROLE_KEY="kunci-akses-penuh-database"
```

Lalu jalankan `bun run dev` (atau `npm run dev`). Masukkan kunci yang sama pada
halaman `/kontrol`. Jika `DEVELOPER_CONTROL_SECRET` belum diisi, halaman
`/kontrol` menampilkan pesan bahwa kuncinya belum dipasang — bukan lagi
"kunci salah".

Catatan: `SUPABASE_SERVICE_ROLE_KEY` hanya tersedia bila database dikelola
sendiri. Pada aplikasi online, gunakan `/kontrol` di alamat resmi aplikasi.
