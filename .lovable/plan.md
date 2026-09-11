# Satu Aplikasi Bersama untuk Banyak Store (Tahan Mati Internet)

Aplikasi diubah dari "satu aplikasi satu store" menjadi satu aplikasi yang dipakai semua store, dengan data tiap store terpisah rapi. Kasir tetap bisa bekerja saat internet mati; semua yang dikerjakan offline dikirim otomatis begitu koneksi kembali.

## Yang akan Anda lihat

**Untuk Anda (Developer)**
- Di halaman kontrol, Anda membuat store baru langsung di sini: kode store, nama, kota, masa aktif. Tidak perlu lagi mendaftarkan alamat aplikasi tiap store.
- Satu daftar berisi semua store: status masa aktif (Aktif / Segera berakhir / Kedaluwarsa), tombol perpanjang cepat, dan pengubahan seluruh data store.
- Anda menunjuk satu orang sebagai Installer/Admin pertama untuk tiap store.

**Untuk staf store**
- Masuk seperti biasa. Setelah masuk, mereka hanya melihat data store-nya sendiri: unit TV, tarif, menu, transaksi, laporan. Data store lain tidak mungkin terbaca.
- Menu Store menjadi baca-saja seperti sekarang; masa aktif dan peringatan berkedip tetap berlaku per store.

**Saat internet mati**
- Penanda kecil di atas layar: "Mode luring — data disimpan di perangkat".
- Kasir tetap bisa: mulai sesi, tambah makanan/minuman, tambah/kurangi waktu ekstra, terima pembayaran (termasuk sebagian dan campur metode), akhiri sesi. Timer tetap akurat karena dihitung dari jam mulai.
- Yang tidak bisa saat luring: masuk pertama kali di perangkat baru, mengundang staf, mengubah data store, dan laporan yang menarik data terbaru dari pusat.
- Begitu internet kembali, semuanya terkirim otomatis dan penanda hilang. Kalau ada yang gagal terkirim, muncul pemberitahuan dengan tombol coba lagi.

## Cara kerja penyimpanan

Perangkat kasir tetap menyimpan salinan lengkap datanya seperti sekarang, jadi layar selalu cepat dan tetap hidup tanpa internet. Perubahan dicatat sebagai daftar antrean dan dikirim ke pusat satu per satu. Bila dua kasir mengubah hal yang sama, yang menang adalah perubahan dengan waktu terbaru.

## Rincian teknis

### Database (migrasi)
- `stores`: kode, nama, email, alamat, kota, pemilik, telepon, versi aplikasi, kontak developer, `expires_at`, `active`. Menggantikan peran `store_settings` (data lama dipindahkan ke satu baris store).
- `store_members(store_id, user_id, role)` — mengikat akun ke store; `profiles` mendapat `store_id` untuk pencarian cepat.
- Tabel data per store, semuanya bertanda `store_id` + `updated_at` + `deleted_at`: `stations`, `console_rates`, `menu_items`, `payment_methods`, `rental_packages`, `customers`, `bookings`, `promotions`, `point_entries`, `sessions`, `settlements`, `history_records`, `store_prefs`.
- Fungsi privat `app_private.current_store_id()` dan `app_private.has_role`; RLS setiap tabel: baca/tulis hanya bila `store_id = current_store_id()`, dengan aturan tambahan admin/installer untuk pengaturan. GRANT eksplisit untuk `authenticated` + `service_role`, tanpa `anon`.
- Setiap tabel: trigger `update_updated_at_column`.

### Sinkronisasi
- `src/lib/sync/outbox.ts`: antrean operasi (`{ id, table, op, row, at }`) di localStorage; `flush()` mengirim lewat server function `pushChanges` (`requireSupabaseAuth`) yang meng-`upsert` per tabel dengan `store_id` dari keanggotaan pengguna dan menolak baris store lain.
- `pullChanges({ since })`: mengambil baris dengan `updated_at > since` per tabel; hasil digabung ke state lokal dengan aturan "waktu terbaru menang".
- `billing-store.tsx` dipertahankan sebagai sumber tampilan; setiap aksi tetap menulis ke state + localStorage, lalu mencatat operasi ke outbox. Flush dipicu oleh `online`, `visibilitychange`, `focus`, dan interval saat daring.
- Indikator daring/luring + jumlah antrean di header (`__root.tsx`).

### Pusat kontrol
- `/api/public/store-registry` beralih dari memanggil aplikasi store lain menjadi membaca/menulis tabel `stores` langsung (tetap dijaga `DEVELOPER_CONTROL_SECRET` dengan `timingSafeEqual`). Action: `list`, `create`, `update`, `delete`, `extend`, `assign-admin`.
- `kontrol.tsx` disesuaikan: form tambah store berisi data store (bukan alamat + kunci), penanda masa aktif, penunjukan Admin/Installer pertama.
- Masa aktif dibaca aplikasi store dari `stores` miliknya; nilai terakhir disimpan di perangkat agar penguncian tetap berlaku saat luring.

### Migrasi data yang sudah ada
- Satu store awal dibuat dari `store_settings` sekarang; semua akun yang ada ditautkan ke store itu, sehingga tidak ada data yang hilang.
- Data billing yang kini hanya ada di perangkat (unit, tarif, transaksi) diunggah sekali lewat outbox saat pertama kali daring setelah pembaruan.

## Tahapan pengerjaan
1. Migrasi database + RLS + fungsi keanggotaan store.
2. Lapisan sinkronisasi (outbox, push, pull) dan indikator luring.
3. Menyambungkan `billing-store` ke sinkronisasi, plus unggah data awal.
4. Pusat kontrol multi-store + penunjukan admin pertama.
5. Penguncian masa aktif per store dan penyesuaian menu Store.
