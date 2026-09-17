# Cetak langsung ke printer thermal tanpa aplikasi pihak ketiga

## Jawaban singkat

Ya, bisa — dan untuk sebagian besar printer bisa langsung dari aplikasi ini, tanpa RawBT.
Yang perlu dipahami: printer thermal punya dua cara sambungan Bluetooth.

- **Bluetooth "modern" (BLE)** dan **USB**: aplikasi bisa memindai, memilih, lalu mencetak
  langsung dari halaman aplikasi di Chrome/Edge, baik Windows 11 maupun Android.
  Inilah cara W&O POS / MokaPOS terasa mudah: pindai, pilih, tentukan lebar kertas, cetak.
- **Bluetooth "lama" (Classic/SPP)**: browser mana pun tidak diizinkan membukanya.
  Untuk printer jenis ini, cetak langsung dilakukan lewat aplikasi Android RenToPlay yang
  sudah ada (bukan RawBT), atau printer disambung USB ke perangkat kasir.

Windows 11 sekarang gagal karena RawBT hanya ada di Android — jadi tidak pernah cocok untuk PC.
Setelah perubahan ini, Windows 11 mencetak langsung lewat USB atau Bluetooth BLE.

## Yang akan dibangun

1. **Pemindaian printer di menu Printer**
   - Tombol "Pindai printer" menampilkan daftar perangkat Bluetooth dan USB yang tersedia.
   - Printer yang dipilih diingat per perangkat kasir, jadi cukup dipilih sekali.
   - Setiap store bebas memakai jenis printer berbeda; pengaturan tersimpan per perangkat.

2. **Cetak langsung ESC/POS**
   - Struk, invoice, label dapur/bar, dan laporan dikirim sebagai perintah ESC/POS
     (teks, tebal, rata tengah, potong kertas, buka drawer bila didukung).
   - Lebar kertas 40 mm / 58 mm / 80 mm, plus header, footer, margin, ukuran huruf,
     dan jumlah salinan tetap bisa diatur seperti sekarang.
   - Tombol "Uji cetak" mengirim contoh struk agar bisa dicek sebelum dipakai.

3. **Pilihan cara cetak yang disederhanakan**
   - Pilihan menjadi: **Langsung (Bluetooth)**, **Langsung (USB)**, **Aplikasi Android**,
     dan **Dialog cetak perangkat** untuk printer A4.
   - RawBT dihapus dari pilihan agar tidak lagi jadi sumber error.

4. **Pesan kegagalan yang jelas**
   - Bila printer mati, terputus, atau jenisnya Bluetooth lama, aplikasi menyebut
     penyebabnya dan menyarankan langkah berikutnya (sambung USB atau pakai aplikasi Android).

## Catatan teknis

- Bluetooth langsung memakai Web Bluetooth (GATT write, chunk 20-180 byte, karakteristik
  penulisan pada service printer 0xFFE0/0xFF00/18F0); USB memakai WebUSB (kelas printer 0x07,
  fallback vendor bulk-out) — keduanya berjalan di Chrome/Edge dan wajib HTTPS + gestur klik.
- Perangkat yang sudah diberi izin dibuka kembali lewat `getDevices()` sehingga tidak
  perlu memilih ulang setiap kali; ID perangkat disimpan lokal per perangkat kasir.
- Penyusun ESC/POS baru (`src/lib/escpos.ts`) memakai teks yang sudah ada di
  `print-docs.ts` (`receiptText`, teks label, teks laporan), jadi isi dokumen tidak berubah.
- `printing.ts`: `PrintMode` menjadi `"system" | "bluetooth" | "usb" | "android"`;
  helper RawBT dihapus, alur Android tetap dipakai untuk Bluetooth Classic.
- Safari/iOS tidak mendukung Web Bluetooth/WebUSB; di perangkat itu tetap tersedia
  dialog cetak sistem. Tidak ada perubahan basis data.
