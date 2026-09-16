# Pembatasan Akses: Daftar Kode Perangkat per Store

## Kesimpulan singkat

IP lokal tidak bisa dipercaya di browser (Chrome & Safari menyamarkan alamat lokal jadi nama acak `xxxx.local`), jadi memakainya sebagai kunci akan sering menolak perangkat yang sah. Yang paling pasti dan tidak berubah adalah **kode perangkat**: dibuat sekali di perangkat itu, tersimpan permanen, tidak terpengaruh Wi-Fi, data seluler, atau restart router.

Karena itu pembatasan akan memakai **daftar kode perangkat** (boleh banyak perangkat per store), dan daftar IP tetap ada sebagai pelengkap opsional.

## Yang akan dikerjakan

1. **Data Store bisa menyimpan banyak kode perangkat**
   - Kolom "Perangkat yang Diizinkan" jadi daftar (satu kode per baris), bukan satu kolom saja.
   - Bisa diisi/diubah oleh Manager & Installer seperti sekarang, tanpa Kunci Developer.
   - Setiap baris bisa diberi keterangan singkat (misal "Kasir 1", "Tablet meja"), supaya mudah dikenali.
   - Perangkat yang sedang dipakai tampil di atas dengan tombol "Tambahkan perangkat ini".

2. **Aturan akses**
   - Kode perangkat ada di daftar → boleh transaksi penuh.
   - Kode tidak ada, tapi IP-nya cocok dengan pola di daftar IP (opsional) → boleh transaksi.
   - Selain itu → ditolak saat masuk, kecuali level Manager, Installer, atau Developer (mereka selalu bisa masuk dari mana saja).
   - Kalau daftar kode dan daftar IP dua-duanya kosong → semua perangkat diizinkan (seperti sekarang).
   - Perangkat yang sudah pernah lolos tetap bisa bekerja saat internet mati.

3. **Halaman masuk**
   - Tetap menampilkan kode perangkat dengan tombol salin (ini yang perlu dikirim ke Manager).
   - Tampilan alamat IP diberi keterangan bahwa itu alamat internet store, bukan alamat Wi-Fi lokal, agar tidak membingungkan lagi.

4. **Log Book**
   - Penambahan dan penghapusan perangkat yang diizinkan dicatat lengkap dengan pelakunya.

## Saran tambahan (ikut dikerjakan, ringan)

- **Daftar IP tetap dipertahankan** sebagai jaring kedua: isi pola IP publik store (misal `103.10.*`) supaya perangkat baru di dalam store bisa langsung dipakai sementara sebelum kodenya didaftarkan.
- **Kode perangkat bisa dihapus** kapan saja, jadi kalau perangkat hilang atau dijual, aksesnya langsung mati.

## Catatan teknis

- Migrasi: kolom baru `allowed_devices jsonb default '[]'` pada `stores` (isi: `{ code, label }`), diisi otomatis dari `device_code` lama; `device_code` dibiarkan agar data lama tetap terbaca.
- RPC `store_set_device_access` diperluas menerima `_allowed_devices` (tetap security definer, hanya installer/manager/admin lewat `store_members`).
- `src/lib/store-info.ts`: tambah field `allowed_devices` di select & tipe.
- `src/lib/device-guard.tsx`: `allowed` mencocokkan `code` ke daftar `allowed_devices` (fallback ke `device_code`), `ipMatches` tidak berubah.
- `src/routes/_authenticated/store.tsx`: `DeviceAccessSection` jadi tabel baris-per-baris (kode + label + hapus) memakai pola `SetupTable`, plus tombol tambah perangkat ini.
- `src/routes/auth.tsx`: penolakan masuk mengikuti daftar; teks keterangan IP diperjelas.
- `src/routes/api/public/store-registry.ts`: skema & select ikut menerima `allowed_devices`.
- Tanpa perubahan logika transaksi maupun sinkronisasi.
