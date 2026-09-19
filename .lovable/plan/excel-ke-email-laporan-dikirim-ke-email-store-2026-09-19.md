# Excel ke Email: laporan dikirim ke email store

Ide ini lebih sederhana dan tidak bergantung pada izin Google yang bisa kedaluwarsa. Satu catatan penting: pengiriman email di Lovable **tidak mendukung lampiran berkas**. Jadi laporan tidak dikirim sebagai attachment, melainkan sebagai **tautan unduh aman** di dalam email — kasir/pemilik klik tautan, berkas Excel langsung terunduh. Isi dan format berkasnya sama persis dengan tombol Excel yang sekarang.

## Yang akan dibuat

1. **Tombol "Excel ke Email"** menggantikan "Excel ke Drive" di semua halaman laporan.
   - Menampilkan tujuan pengiriman: email yang terdaftar di data store (Email Store).
   - Setelah ditekan: "Laporan dikirim ke <email store>."
   - Kalau Email Store belum diisi: "Email store belum diisi. Buka Setup → Store untuk mengisi Email Store."
   - Boleh juga mengirim ke email lain sekali jalan (kolom opsional "Kirim juga ke"), berguna untuk pemilik/akuntan.

2. **Email yang diterima** berisi: nama store, judul laporan, periode laporan, waktu pembuatan, nama kasir yang mengirim, dan tombol "Unduh laporan Excel". Tautan berlaku 7 hari.

3. **Berkas laporan disimpan aman** di penyimpanan aplikasi (tidak publik), hanya bisa dibuka lewat tautan bertanda tangan dari email.

4. **Tombol "Excel" (simpan di perangkat) tetap ada** tanpa perubahan.

5. **Ekspor ke Google Drive dihapus** beserta pesan kesalahan izinnya, karena sudah tidak dipakai.

## Yang perlu Anda siapkan (sekali saja)

Pengiriman email butuh domain pengirim milik Anda. Anda sudah punya **rentoplay.id**, jadi saya akan membuka dialog penyiapan email untuk domain itu — Anda hanya perlu menyetujui/menempelkan beberapa data DNS sekali. Setelah terverifikasi, semua store bisa langsung menerima laporan lewat email tanpa penyiapan tambahan.

## Catatan teknis

- Berkas .xlsx dibuat di perangkat (seperti sekarang, `src/lib/report-excel.ts`), dikirim base64 ke server function baru `src/lib/report-email.functions.ts` (dengan `requireSupabaseAuth`).
- Server function: unggah ke bucket privat `reports` (`storage_create_bucket`) pada path `<store_id>/<tahun-bulan>/<nama-berkas>`, buat signed URL 7 hari, lalu kirim email lewat `sendTemplateEmail` (helper hasil scaffold app emails) dengan `idempotencyKey` dari store + nama berkas.
- Template React Email baru `src/lib/email-templates/report-ready.tsx` + registrasi di `registry.ts`; `SITE_NAME` mengikuti nama aplikasi.
- Penerima diambil server-side dari `stores.store_email` untuk store si pengirim (bukan dari input browser); kolom "Kirim juga ke" divalidasi format email dan dibatasi satu alamat tambahan.
- `src/components/reports/ExportExcelButton.tsx` diganti tombol kirim email; `src/lib/drive-export.functions.ts` dihapus. Sambungan Google Drive di project bisa dilepas setelahnya.
- Halaman Finance (riwayat kas) yang juga memakai ekspor Drive ikut diganti ke jalur email yang sama.
