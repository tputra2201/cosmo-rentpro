# Kembalikan pilihan cetak lewat RawBT untuk printer Bluetooth lama

## Kesimpulan dari uji Anda

- BP-Lite 80D1 berhasil dicetak langsung dari aplikasi (Bluetooth modern/BLE).
- Blueprint ECO 80BT (RPP02N) hanya mau menerima data lewat Bluetooth "lama"
  (Classic/SPP). Browser tidak bisa membuka jalur itu, jadi cetak langsung
  selalu berhenti dengan "memutus sambungan". RawBT bisa karena ia aplikasi
  Android yang memakai jalur lama tersebut.

Karena RawBT terbukti bekerja untuk printer ini, pilihan RawBT dikembalikan —
bukan menggantikan cetak langsung, tapi sebagai pilihan per printer.

## Yang akan dikerjakan

1. **Pilihan cara cetak per printer menjadi lima**
   - Langsung — printer Bluetooth (BLE)
   - Langsung — printer USB
   - **RawBT (printer Bluetooth lama)** ← dikembalikan
   - Aplikasi Android RenToPlay
   - Dialog cetak perangkat (printer A4)

   Jadi printer struk tetap memakai cetak langsung, dan printer label RPP02N
   diatur ke RawBT.

2. **Cetak lewat RawBT diperbaiki**
   - Struk, bill, label, dan laporan dikirim ke RawBT sebagai teks ESC/POS
     sesuai lebar kertas (40/58/80 mm), termasuk header, footer, margin,
     ukuran huruf, dan jumlah salinan seperti pengaturan printer.
   - Pengiriman memakai tautan RawBT tanpa pengkodean ganda, supaya tidak
     terulang lagi kesalahan "wrong base64" yang pernah muncul.
   - "Uji cetak" di Setup → Printer memakai jalur yang sama, jadi hasil uji
     mencerminkan cetakan sesungguhnya.

3. **Petunjuk singkat di halaman Printer**
   - Untuk mode RawBT: keterangan bahwa aplikasi RawBT perlu terpasang di
     HP/tablet Android dan printer sudah dipasangkan di pengaturan Bluetooth,
     serta bahwa mode ini tidak tersedia di PC Windows (di PC pakai cetak
     langsung Bluetooth/USB).
   - Bila RawBT tidak terpasang, pesannya menyebut hal itu, bukan error teknis.

## Catatan teknis

- `src/lib/printing.ts`: `PrintMode` menjadi
  `"system" | "bluetooth" | "usb" | "rawbt" | "android"`; kembalikan
  `printViaRawBt(printer, text)` memakai skema
  `rawbt:base64,<payload>` dengan `toBase64()` (tanpa `encodeURIComponent`),
  serta label & daftar mode diperbarui.
- `src/lib/print-docs.ts`: `printReceipt` / `printLabels` / `printReport`
  menambah cabang `mode === "rawbt"` → `printViaRawBt(printer, textWithCopies(...))`.
- `src/routes/_authenticated/printer.tsx`: mode RawBT menyembunyikan tombol
  "Pindai printer" (tidak relevan) dan menampilkan catatan pemakaian; tombol
  "Uji cetak" mengikuti mode terpilih.
- Cetak langsung BLE/USB tetap seperti sekarang, termasuk printer yang diingat.
- Tidak ada perubahan basis data.
