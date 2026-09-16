# End of Day — Siklus Hari Usaha

Rental PS buka jam 10 pagi sampai jam 2 pagi, jadi laporan berdasarkan tanggal kalender selalu terpotong. Rencana ini membuat siklus akuntansi harian mengikuti "hari usaha": mulai saat kasir pertama check-in, berakhir saat proses End of Day dijalankan.

## Cara kerja

- Hari usaha terbuka otomatis saat shift pertama check-in.
- Setelah kasir menutup shift terakhir (tidak ada shift lain yang masih berjalan), muncul langkah "End of Day" di halaman Kasir.
- Kasir shift terakhir yang menjalankan End of Day. Sebelum ditutup, ditampilkan rekap Company Report untuk hari usaha itu, lalu tombol "Tutup Hari Usaha".
- Jaring pengaman: kalau End of Day lupa dijalankan, sistem menutup hari usaha itu otomatis pada jam tutup operasional (mis. 02:00) + tenggang, sesuai pengaturan di Setup → Store. Penutupan otomatis diberi tanda "ditutup otomatis".
- Selama hari usaha masih terbuka, halaman Kasir menampilkan status: jam mulai, jumlah shift, dan lama berjalan.

## Jam operasional di Setup → Store

Dua field baru: Jam buka (default 10:00) dan Jam tutup (default 02:00, dianggap keesokan hari karena lebih kecil dari jam buka). Nilai ini dipakai untuk menentukan batas hari usaha pada laporan.

## Laporan & statistik

- Pemilih periode tetap memakai tanggal seperti sekarang, tapi tanggal itu dibaca sebagai hari usaha: pilih 16 September → laporan mencakup 16 Sep 10:00 sampai 17 Sep 02:00, sesuai jam operasional store.
- Label periode menjelaskan rentangnya, mis. "16 September 2026 · 10:00 – 17 Sep 02:00".
- Untuk hari usaha yang sudah ditutup lewat End of Day, batas akhir memakai waktu End of Day sebenarnya (jadi kalau tutup 02:35, transaksi sampai 02:35 tetap masuk). Hari yang masih berjalan memakai waktu sekarang.
- Mode Bulan dan Tahun juga bergeser mengikuti jam operasional: bulan September = 1 Sep 10:00 sampai 1 Okt 02:00.
- Semua tab laporan (Nota, Per Kasir, Metode, Kartu, Membership, Cash Close Out, Log Book, Statistik, Company) memakai batas ini, termasuk Statistik Tanggal/Hari yang mengelompokkan transaksi jam 00:00–02:00 ke tanggal hari usaha sebelumnya.


## Rekap End of Day

Rekap yang tampil saat penutupan dan tersimpan sebagai riwayat memakai isi Company Report untuk periode hari usaha tersebut, plus jam buka–tutup, daftar shift, dan siapa yang menutup.

## Log Book

Tercatat: hari usaha dibuka, End of Day dijalankan (oleh siapa, dengan total penjualan), dan penutupan otomatis lewat jam batas.

## Catatan teknis

- Tipe baru `BusinessDay` di `src/lib/billing-store.tsx`: `id`, `openedAt`, `closedAt`, `closedByName/Id`, `autoClosed`, `sequence`, `note`. Disimpan lewat mekanisme sync/offline yang sudah ada (store-scoped, aman saat internet mati) sama seperti `shifts`.
- `openShift` membuka hari usaha bila belum ada yang terbuka; `closeShift` tidak menutup hari usaha, hanya membuat End of Day tersedia. Aksi baru `closeBusinessDay(input)` dan pemeriksaan auto-close saat aplikasi hidup / tick `now`.
- Jam operasional disimpan di data store (`open_hour`/`close_hour`, default 10 dan 2) sehingga tersinkron antar perangkat; tidak mengubah policy RLS yang ada.
- `src/lib/report-range.ts`: `rangeBounds` menerima jam operasional dan menggeser batas (start = tanggal + jam buka, end = tanggal berikutnya + jam tutup). Bila hari usaha itu sudah punya `closedAt`, batas akhir memakai `closedAt`; bila masih berjalan memakai `now`. Semua komponen laporan tetap memakai `inRange`, sehingga hanya sumber jam operasional dan agregasi Statistik Tanggal/Hari yang perlu disesuaikan.
- `ReportRangePicker` dan `rangeLabel` menampilkan rentang jam agar jelas.
- Halaman Kasir (`src/routes/_authenticated/shift.tsx`) mendapat panel status hari usaha + panel End of Day dengan rekap Company Report.
