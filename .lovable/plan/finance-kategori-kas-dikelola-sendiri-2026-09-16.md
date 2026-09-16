# Finance: Kategori kas dikelola sendiri

Di Finance → Kas Lain & Pengeluaran → tab Item & Kelompok, kata "Kelompok" diganti "Kategori", dan kategori punya daftar sendiri untuk ditambah, diubah, dan dihapus. Saat mengatur item uang masuk/keluar, kategori dipilih dari daftar itu — tidak lagi diketik bebas.

## Yang berubah di tampilan

- Nama tab jadi "Item & Kategori". Semua tulisan "Kelompok" (tabel item, panel detail, riwayat, laporan yang menampilkan kolom ini) jadi "Kategori".
- Tab tersebut berisi empat panel berurutan:
  1. Kategori uang masuk — tabel satu baris per kategori + form tambah singkat.
  2. Item uang masuk — seperti sekarang, tapi kategori dipilih dari daftar.
  3. Kategori uang keluar.
  4. Item uang keluar.
- Panel kategori: tabel dengan kolom Nama Kategori dan Jumlah Item, tombol detail (ubah nama) dan hapus di ujung baris — pola tabel yang sama seperti halaman Setup lain.
- Kategori yang masih dipakai item tidak bisa dihapus; muncul pesan agar item dipindah dulu.
- Mengubah nama kategori otomatis ikut memperbarui semua item yang memakainya.
- Di form tambah item dan panel detail item, kolom kategori jadi pilihan (dropdown) berisi kategori sesuai arah uang (masuk/keluar). Kalau belum ada kategori, muncul petunjuk untuk membuat kategori dulu.

## Data

- Kategori tersimpan sebagai daftar tersendiri: nama, arah (masuk/keluar), status, urutan.
- Kategori bawaan diambil otomatis dari nilai kelompok yang sudah ada sekarang (Pendapatan Lain, Kas Owner, Playing Card, Operasional, Gaji, Lainnya), jadi data lama tetap utuh dan tidak ada catatan kas yang berubah.

## Catatan teknis

- `src/lib/billing-store.tsx`: tambah tipe `CashGroup { id, name, direction, active, sort }` dan state `cashGroups`, dengan `addCashGroup`, `updateCashGroup`, `removeCashGroup`, `reorderList("cashGroups", ...)`. Migrasi saat load: kumpulkan nilai unik `cashCategories[].group` per direction bila `cashGroups` belum ada. Rename kategori memperbarui `cashCategories[].group` yang cocok. Tambahkan describer Log Book untuk ketiga aksi baru, mengikuti pola `LOG_DESCRIBERS` yang ada.
- `src/routes/_authenticated/kas.tsx`: komponen baru `GroupEditor({ direction })` memakai `SetupTable`/`DetailField`; `CategoryEditor` memakai `Select` untuk field kategori (form tambah dan panel detail); label teks diperbarui; tab value tetap `kategori`.
- `CashEntry.group` tetap menyimpan nama kategori seperti sekarang, sehingga riwayat, laporan, dan ekspor Excel tidak perlu diubah selain label kolom.
- Tanpa perubahan skema database.
