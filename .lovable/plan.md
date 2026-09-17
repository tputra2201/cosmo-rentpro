# Printer label RPP02N: cetak stabil dari perangkat Android

## Apa yang terjadi

Blueprint ECO 80BT (RPP02N) dulu bisa dicetak lewat RawBT karena RawBT memakai
Bluetooth "lama" (Classic/SPP). Nama RPP02N_Ble yang muncul di dialog browser
adalah jalur Bluetooth modern (BLE) printer yang sama, dan pada printer ini
jalur itu memutus sambungan begitu diminta mengirim data — karena itu muncul
"RPP02N_Ble memutus sambungan".

Perangkatnya Android dan USB tidak akan dipakai, jadi rencananya: buat jalur
Bluetooth langsung lebih sabar dulu, dan siapkan jalur Bluetooth lama lewat
aplikasi Android RenToPlay sebagai pengganti RawBT.

## Yang akan dikerjakan

1. **Sambungan Bluetooth langsung dibuat lebih sabar**
   - Saat memindai, printer dicari lewat jalur cetak yang dikenal (bukan
     menampilkan semua perangkat), sehingga yang dipilih memang jalur cetaknya.
   - Setelah tersambung, aplikasi langsung menuju jalur tulis yang dikenal
     printer struk/label kecil, tanpa memeriksa seluruh layanan (pemeriksaan
     penuh inilah yang sering membuat printer memutus sambungan).
   - Jeda antar potongan data dinaikkan dan potongan diperkecil untuk printer
     yang lambat menerima.

2. **Jalur Bluetooth lama lewat aplikasi Android RenToPlay**
   - Bila printer tetap memutus sambungan, aplikasi otomatis mencoba jalur
     aplikasi Android (Bluetooth lama), bukan langsung gagal.
   - Di Setup → Printer, mode "Aplikasi Android" bisa memilih printer dari
     daftar perangkat yang sudah dipasangkan di HP/tablet, lalu "Uji cetak".
   - Bila halaman dibuka dari Chrome biasa (bukan aplikasi RenToPlay),
     pesannya jelas: buka dari aplikasi Android RenToPlay untuk printer jenis
     ini, dengan keterangan singkat di halaman Printer.

3. **Pesan kegagalan yang menuntun**
   - Pesan menyebut nama printer, penyebabnya (printer memakai Bluetooth lama),
     dan langkah yang harus diambil, bukan hanya "memutus sambungan".

## Catatan teknis

- `src/lib/escpos.ts`: `pickBluetooth()` memakai `filters` layanan cetak
  (0x18F0, 0xFFE0, 0xFF00, 0xFFE5, 0xAE30) dengan `acceptAllDevices` sebagai
  cadangan; `connectGatt()` mencoba `getPrimaryService(known)` satu per satu
  sebelum jatuh ke `getPrimaryServices()`; chunk 60 byte, jeda 40 ms; error
  disconnect berulang dilempar sebagai `SppLikelyError`.
- `src/lib/print-docs.ts`: bila `printDirect` mengembalikan kegagalan bertipe
  SPP dan `isAndroidPrintAvailable()`, otomatis panggil `printViaAndroid`.
- `src/routes/_authenticated/printer.tsx`: mode "Aplikasi Android" menampilkan
  daftar printer terpasang (`pairedAndroidPrinters()`), simpan
  `bluetoothAddress`, plus catatan bila jembatan Android belum tersedia.
- Aplikasi Android sudah punya jembatan cetak (`PrintBridge.java`), jadi tidak
  ada perubahan kode Android; hanya APK RenToPlay perlu dipasang di tablet.
- Tidak ada perubahan basis data.
