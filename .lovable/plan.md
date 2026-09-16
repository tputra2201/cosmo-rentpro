# End of Day — Siklus Hari Usaha

Rental PS buka jam 10 pagi sampai jam 2 pagi, jadi laporan berdasarkan tanggal kalender selalu terpotong. Rencana ini membuat siklus akuntansi harian mengikuti "hari usaha": mulai saat kasir pertama check-in, berakhir saat proses End of Day dijalankan.

## Cara kerja

- Hari usaha terbuka otomatis saat shift pertama check-in.
- Setelah kasir menutup shift terakhir (tidak ada shift lain yang masih berjalan), muncul langkah "End of Day" di halaman Kasir.
- Kasir shift terakhir yang menjalankan End of Day. Sebelum ditutup, ditampilkan rekap Company Report untuk hari usaha itu, lalu tombol "Tutup Hari Usaha".
- Jaring pengaman: kalau End of Day lupa dijalankan, sistem menutup hari usaha itu secara otomatis pada jam batas (default 08:00, bisa diubah di Setup → Store). Penutupan otomatis diberi tanda "ditutup otomatis" supaya terlihat bedanya.
- Selama hari usaha masih terbuka, halaman Kasir menampilkan status: jam mulai, jumlah shift, dan lama berjalan.

## Laporan & statistik

- Pemilih periode laporan mendapat mode baru "Hari Usaha" dan menjadi pilihan default, dengan label jelas seperti "Hari Usaha 16 Sep · 10:00 – 02:35".
- Mode Tanggal/Bulan/Tahun kalender tetap tersedia sebagai pilihan.
- Semua tab laporan (Nota, Per Kasir, Metode, Kartu, Membership, Cash Close Out, Log Book, Statistik, Company) ikut mode hari usaha, termasuk Statistik Tanggal/Hari/Jam yang mengelompokkan berdasarkan hari usaha, bukan tanggal kalender.

## Rekap End of Day

Rekap yang tampil saat penutupan dan tersimpan sebagai riwayat memakai isi Company Report untuk periode hari usaha tersebut, plus jam buka–tutup, daftar shift, dan siapa yang menutup.

## Log Book

Tercatat: hari usaha dibuka, End of Day dijalankan (oleh siapa, dengan total penjualan), dan penutupan otomatis lewat jam batas.

## Catatan teknis

- Tipe baru `BusinessDay` di `src/lib/billing-store.tsx`: `id`, `openedAt`, `closedAt`, `closedByName/Id`, `autoClosed`, `sequence`, `note`. Disimpan lewat mekanisme sync/offline yang sudah ada (store-scoped, aman saat internet mati) sama seperti `shifts`.
- `openShift` membuka hari usaha bila belum ada yang terbuka; `closeShift` tidak menutup hari usaha, hanya membuat End of Day tersedia. Aksi baru `closeBusinessDay(input)` dan pemeriksaan auto-close saat aplikasi hidup / tick `now`.
- Jam batas disimpan di data store (`eod_cutoff_hour`, default 8) sehingga tersinkron antar perangkat; tidak mengubah policy RLS yang ada.
- `src/lib/report-range.ts`: tambah mode `"business"`, dan `rangeBounds` menghitung batas dari `openedAt`/`closedAt` hari usaha terpilih (hari yang masih terbuka memakai `now` sebagai batas atas). Semua komponen laporan tetap memakai `inRange`, jadi tidak perlu diubah satu-satu kecuali agregasi Statistik Tanggal/Hari/Jam.
- `ReportRangePicker` mendapat pilihan hari usaha (dropdown daftar hari usaha terakhir).
- Halaman Kasir (`src/routes/_authenticated/shift.tsx`) mendapat panel status hari usaha + panel End of Day dengan rekap Company Report.
