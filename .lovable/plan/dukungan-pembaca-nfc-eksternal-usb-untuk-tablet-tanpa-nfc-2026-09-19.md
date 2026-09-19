# Dukungan pembaca NFC eksternal (USB) untuk tablet tanpa NFC

## Penjelasan singkat (kenapa tombol Scan NFC gagal)

Tombol "Scan NFC" memakai fitur Web NFC di Chrome, yang **hanya bisa membaca chip NFC bawaan tablet/ponsel**. Browser tidak punya akses ke pembaca NFC eksternal (USB maupun Bluetooth), jadi pesan "Izin NFC ditolak atau NFC belum aktif" akan selalu muncul di tablet tanpa NFC bawaan. Ini keterbatasan browser, bukan bug aplikasi.

## Solusi yang direkomendasikan: pembaca USB mode keyboard (HID)

Pembaca kartu USB murah (±Rp100–300 ribu, misalnya pembaca RFID 125 kHz / Mifare 13,56 MHz "keyboard wedge") bekerja seperti keyboard: tempel kartu → alat **mengetik nomor kartu lalu menekan Enter** secara otomatis. Kolom nomor kartu di aplikasi sudah mendukung pola ini (ketik + Enter), jadi tidak perlu aplikasi tambahan.

Yang perlu dibeli: pembaca RFID/NFC USB dengan deskripsi "keyboard emulation / HID / plug and play, output nomor kartu + Enter". Hindari pembaca yang butuh driver/SDK khusus (ACR122U dsb.) karena tidak bisa dipakai browser.

## Perubahan di aplikasi agar alat ini makin mulus

1. **Auto-fokus ke kolom kartu**: kolom nomor kartu di semua panel (Playing Card, pembayaran TV/kafe, top up) otomatis aktif saat panel dibuka, jadi kasir tinggal tempel kartu tanpa menyentuh layar dulu.
2. **Tangkap ketikan cepat dari pembaca**: jika fokus tidak sengaja pindah, ketikan cepat yang diakhiri Enter tetap diarahkan ke kolom kartu selama panel kartu terbuka.
3. **Panduan di dalam aplikasi**: pesan error NFC diperjelas — untuk tablet tanpa NFC diarahkan memakai pembaca USB mode keyboard; tombol "Scan NFC" disembunyikan otomatis di perangkat yang tidak mendukung Web NFC, diganti petunjuk "Tempelkan kartu ke pembaca USB atau ketik nomornya".
4. **Pengaturan opsional di Setup → Playing Card**: pilihan "Mode pembaca USB" (aktif default) yang menyalakan auto-fokus + penangkap ketikan; bisa dimatikan jika mengganggu.

## Tidak termasuk

- Integrasi pembaca USB ber-driver khusus (ACR122U, dsb.) — tidak mungkin dari browser.
- Pembaca Bluetooth SPP — sama seperti printer, tidak bisa diakses browser.

## Teknis

- Ubah `src/components/CardScanInput.tsx`: auto-fokus, penyembunyian tombol NFC saat `!nfcSupported()`, penangkap keydown global (buffer ketikan cepat <50 ms/antar tombol, diakhiri Enter) saat panel terbuka, teks panduan baru.
- Setting baru di billing store (`cardUsbReaderMode`, default true) + toggle di halaman kartu.
- Tidak ada perubahan database.
