# Tombol "Excel ke Email" di laporan

Domain pengirim **notify.rentoplay.id sudah terverifikasi**, jadi fitur ini bisa dibangun sekarang.

Catatan penting: pengiriman email di Lovable tidak mendukung lampiran berkas. Jadi laporan dikirim sebagai **tautan unduh aman** di dalam email — penerima klik tombol "Unduh laporan Excel" dan berkasnya langsung terunduh. Isi dan format berkas sama persis dengan tombol "Excel" yang sekarang.

## Yang akan dibuat

1. **Tombol "Excel ke Email"** menggantikan "Excel ke Drive" di halaman Reports dan riwayat Finance (Kas).
   - Saat ditekan, muncul kotak kecil berisi tujuan pengiriman: Email Store, plus kolom opsional "Kirim juga ke" (satu alamat tambahan, misal pemilik/akuntan).
   - Setelah terkirim: "Laporan dikirim ke <email store>."
   - Kalau Email Store belum diisi: "Email store belum diisi. Buka Setup → Store untuk mengisi Email Store."

2. **Isi email**: nama store, judul laporan, periode, waktu pembuatan, nama kasir pengirim, dan tombol "Unduh laporan Excel". Tautan berlaku 7 hari.

3. **Berkas disimpan aman** di penyimpanan aplikasi (tidak publik); hanya bisa dibuka lewat tautan bertanda tangan dari email.

4. **Tombol "Excel" (simpan di perangkat) tetap ada** tanpa perubahan.

5. **Ekspor ke Google Drive dihapus** beserta pesan kesalahan izinnya.

## Catatan teknis

- Berkas .xlsx tetap dibuat di perangkat (`src/lib/report-excel.ts`), dikirim base64 ke server function baru `src/lib/report-email.functions.ts` (`requireSupabaseAuth`), dengan input: `title`, `periodText`, `fileName`, `base64`, `extraEmail?`.
- Server function: unggah ke bucket privat `reports` (sudah dibuat) pada path `<store_id>/<YYYY-MM>/<fileName>`, buat signed URL 7 hari, lalu kirim lewat `sendTemplateEmail` dengan `idempotencyKey` dari store + nama berkas + timestamp.
- Penerima utama diambil server-side dari `stores.store_email` milik store si pengirim (bukan dari input browser); `extraEmail` divalidasi format email, maksimal satu alamat.
- Template baru `src/lib/email-templates/report-ready.tsx` + registrasi di `registry.ts` (`report-ready`), gaya mengikuti brand RenToPlay dengan latar `#ffffff`.
- `src/components/reports/ExportExcelButton.tsx`: tombol Drive diganti tombol email + popover kecil; prop `folderName` diganti `storeId`/pemakaian tetap sederhana di `laporan.tsx` dan `kas.tsx`.
- `src/lib/drive-export.functions.ts` dihapus.
- Kebijakan akses storage untuk bucket `reports`: tidak ada policy publik; unggah dan pembuatan tautan hanya dari server (service role).
