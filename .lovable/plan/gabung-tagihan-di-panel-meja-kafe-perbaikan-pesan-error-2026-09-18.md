# Gabung Tagihan di panel meja kafe + perbaikan pesan error

## 1. Perbaiki pesan gagal yang muncul padahal berhasil

Saat menitipkan pesanan meja ke TV (dan saat menggabung TV), pesan merah
"Pesanan meja ini tidak bisa dititipkan" muncul walau penggabungannya berhasil.
Penyebabnya penanda berhasil/gagal dibaca terlalu cepat, sebelum perubahan
selesai diterapkan. Pemeriksaan kelayakan dipindah ke depan (dicek dari data
yang sedang tampil), jadi pesan yang muncul selalu sesuai kenyataan: hijau saat
berhasil, merah hanya kalau memang tidak bisa.

## 2. Gabung Tagihan di panel meja kafe

Di panel meja kafe ditambah tombol **Gabung Tagihan** — sejajar dengan Split
Bill — yang membuka pilihan:

- **Meja lain yang ada pesanannya** → pesanannya pindah ke meja ini dan dibayar
  dari satu panel. Setiap baris pesanan diberi tanda meja asalnya supaya rincian
  tetap terbaca di bill dan struk.
- **TV yang sedang bermain** → pesanan sesi TV itu dititipkan ke meja ini.
  Biaya rentalnya tetap dibayar di panel TV; hanya makanan/minumannya yang ikut.

Sebelum digabung tampil ringkasan (apa yang ikut dan total barunya) dengan
konfirmasi. Selama belum dibayar, tersedia tombol **Lepas gabungan** yang
mengembalikan pesanan ke meja / sesi TV asalnya.

Semua penggabungan dan pelepasan tercatat di Log Book lengkap dengan waktu,
nama petugas, asal, dan tujuannya.

## Catatan teknis

- Tanpa perubahan basis data.
- `billing-store.tsx`: `mergeStations` / `linkCafeTable` menghitung kelayakan
  dari `state` sekarang lalu mengembalikan boolean yang benar (tidak lagi dari
  dalam updater `setState`).
- Tambahan aksi: `mergeCafeTables(parentTableId, childTableIds)`,
  `unmergeCafeTables(parentTableId)`, `linkStationToTable(tableId, stationId)`,
  `unlinkStationFromTable(tableId)` — semuanya lewat `withLog`.
- Baris pesanan pindahan menyimpan asalnya (`mods` tanda "Meja X" / "TV X") plus
  id sumber, sehingga "Lepas gabungan" bisa memulihkan ke tempat asalnya.
- `CafeTables.tsx`: tombol Gabung Tagihan + dialog pilihan (meja & TV), panel
  ringkasan gabungan dengan tombol Lepas gabungan, memakai `useConfirm()` dan
  `requireShift()` seperti tombol lain.
