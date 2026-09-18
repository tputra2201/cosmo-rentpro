# Riwayat kas per tanggal + DP & Additional Rental di Reservasi

## 1. Finance → Kas Lain & Pengeluaran → Riwayat

- Tab Riwayat mendapat pemilih periode (hari ini, kemarin, minggu ini, bulan ini, rentang tanggal sendiri) — sama seperti di Reports dan mengikuti **hari usaha**, bukan tanggal kalender.
- Isi riwayat dipecah jadi dua tabel:
  1. **Kas masuk** — semua catatan uang masuk pada periode itu, dengan baris Total di bawahnya.
  2. **Kas keluar** — sama, dengan Total sendiri.
- Di atas tabel ada tiga angka ringkas: Total kas masuk, Total kas keluar, dan Selisih.
- Kolom tetap seperti sekarang: Waktu, Item, Kategori, Jenis, Metode, Catatan, Jumlah, tombol hapus (dengan konfirmasi).
- Tombol **Excel** (simpan ke perangkat) dan **Excel ke Drive** ditambahkan, memakai pembuat Excel yang sama dengan Reports — satu sheet Kas Masuk, satu sheet Kas Keluar, lengkap judul, periode, dan lebar kolom siap cetak. Tidak ada ekspor CSV lagi di halaman ini.

## 2. Reservasi: Additional Rental

- Form reservasi baru mendapat bagian **Additional Rental**: pilih barang dari Setup Price → Additional Rental, isi jumlah, dan isi durasi (menit) untuk barang berharga per jam. Bisa menambah beberapa baris, bisa dihapus sebelum disimpan.
- Daftar barang ikut tampil di baris agenda reservasi dan bisa diubah dari panel detail reservasi.
- Saat **Check-in**, semua additional rental itu otomatis masuk ke panel TV card sesi tersebut dengan jumlah dan durasi yang sama, jadi kasir tidak perlu memasukkan ulang.

## 3. Reservasi: DP (uang muka)

- Form reservasi mendapat field **DP** (nominal) dan **Metode pembayaran DP** (pilihan dari Setup → Payment).
- DP tercatat sebagai **kas masuk yang bukan pendapatan** — sama seperti top-up Playing Card. Jadi ia muncul di Riwayat kas dan di laporan sebagai kas masuk, tidak menambah penjualan.
- Saat pelanggan **check-in**, DP otomatis dipakai sebagai pembayaran awal sesi: panel TV card menampilkan DP yang sudah dibayar dan sisa tagihan berkurang sebesar DP itu. Nilai penjualan nota tetap utuh (DP bukan diskon).
- Kalau reservasi dibatalkan, DP tetap tercatat sebagai kas masuk; pengembaliannya dicatat manual di Uang keluar seperti biasa.
- Semua penambahan/perubahan DP dan additional rental reservasi tercatat di Log Book.

## Catatan teknis

- `Booking` mendapat field opsional `addons?: SessionAddon[]`, `dpAmount?: number`, `dpPayment?: string`, `dpCashEntryId?: string` — opsional supaya reservasi lama tetap terbaca. Tanpa perubahan skema database.
- `addBooking` membuat `CashEntry` DP lewat `addCashEntry` dengan kategori bawaan baru **"DP Reservasi"** (`direction: "in"`, `payout: true`). `removeBooking`/`updateBooking` tidak menghapus catatan kas itu.
- Migrasi state saat load menambahkan dua kategori kas bawaan bila belum ada: "DP Reservasi" (in, payout) dan "DP Reservasi dipakai" (out, payout), beserta kategorinya di `cashGroups`.
- Check-in di `booking.tsx`: setelah `startSession(...)`, panggil `addSessionAddon(stationId, addonId, qty, minutes)` untuk tiap baris addon, lalu untuk DP > 0 catat `Settlement` lewat fungsi pembayaran sesi yang ada (`paySession`-style, `amount = dpAmount`, `amountPaid = dpAmount`, `payment = dpPayment`) dan satu `CashEntry` "DP Reservasi dipakai" (payout, out) agar perkiraan uang tunai di kasir tidak terhitung dua kali.
- Riwayat kas: `src/routes/_authenticated/kas.tsx` memakai `ReportRangePicker`, `defaultRange`, `inRange` dari `src/lib/report-range.ts`, dan `ExportExcelButton` dari `src/components/reports/ExportExcelButton.tsx` dengan `targetRef` ke bagian riwayat.
