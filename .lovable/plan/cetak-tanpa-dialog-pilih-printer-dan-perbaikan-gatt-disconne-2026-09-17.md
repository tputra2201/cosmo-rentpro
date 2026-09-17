# Cetak tanpa dialog pilih printer, dan perbaikan "GATT disconnected"

## Masalah yang dilaporkan

1. Printer struk BP-Lite 80D1 sudah bisa mencetak, tetapi dialog pilih printer
   muncul setiap kali mencetak.
2. Printer label Blueprint ECO 80BT (nama perangkat RPP02N_Ble) gagal:
   "GATT server is disconnected".

## Penyebab

- Aplikasi membuka koneksi baru untuk setiap cetakan dan tidak menyimpan
  perangkat yang sudah dipilih di memori, jadi dialog pemilihan muncul lagi.
- Banyak printer BLE memutus koneksi beberapa detik setelah data terkirim, dan
  pencarian jalur tulis dilakukan terlalu cepat setelah tersambung sehingga
  koneksi terputus di tengah proses.

## Yang akan diperbaiki

1. **Printer diingat selama aplikasi terbuka**
   - Setelah sekali dipilih (lewat "Pindai printer" atau dialog pertama),
     perangkat disimpan di memori aplikasi. Cetakan berikutnya langsung
     dikirim tanpa dialog.
   - Bila browser mengizinkan (Chrome/Edge), perangkat juga dibuka kembali
     otomatis setelah aplikasi ditutup dan dibuka lagi, sehingga tidak perlu
     memilih ulang.
   - Bila browser tidak mengizinkannya, akan muncul catatan singkat di menu
     Printer: pilih printer sekali setelah aplikasi dibuka, lalu cetakan
     selanjutnya berjalan tanpa dialog.

2. **Sambungan lebih tahan putus**
   - Setelah tersambung, aplikasi memberi jeda singkat sebelum mencari jalur
     tulis, dan mencoba ulang sampai tiga kali bila printer memutus koneksi.
   - Bila printer terputus di tengah cetak, aplikasi menyambung lagi dan
     melanjutkan pengiriman dari bagian yang belum terkirim.
   - Potongan data dikirim lebih kecil dengan jeda antar potongan agar printer
     kecil seperti RPP02N tidak kebanjiran data.

3. **Pesan kegagalan yang jelas**
   - Bila tetap terputus, pesan menyebut nama printer dan menyarankan langkah:
     matikan-nyalakan printer, dekatkan perangkat, atau pakai USB.

## Catatan teknis

- `src/lib/escpos.ts`: cache `Map<printerId, {device, writer}>` di modul;
  `writerFor()` memakai cache → `getDevices()` → dialog. Tambahkan
  `connectWithRetry()` (3 percobaan, jeda 300–600 ms, `await` setelah
  `gatt.connect()` sebelum `getPrimaryServices()`), listener
  `gattserverdisconnected` untuk membersihkan cache, ukuran chunk turun ke
  100 byte dengan jeda 25 ms, dan pengiriman ulang potongan yang gagal setelah
  reconnect.
- `src/routes/_authenticated/printer.tsx`: tampilkan status "Tersambung"/
  "Perlu dipilih sekali" pada field Printer terpilih; tidak ada perubahan
  bentuk data printer.
- Tidak ada perubahan basis data.
