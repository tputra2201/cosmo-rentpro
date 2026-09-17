# Pengaturan layout label dapur dan bar

## Hasil yang akan dibuat

Setiap **Kitchen Printer** dan **Bar Printer** memiliki pengaturan sendiri untuk menentukan informasi yang dicetak pada label.

Layout bawaan akan diringkas menjadi empat baris:

```text
[Nama menu]
[Jumlah pesanan]
[Nama pelanggan]
[Tanggal] [Jam]
```

Judul **DAPUR/BAR** dan garis pemisah tidak lagi dicetak secara bawaan.

## Pengaturan di Setup → Printer

Di panel detail printer label akan tersedia pilihan aktif/nonaktif untuk:

- Judul DAPUR/BAR
- Garis pemisah
- Nama menu
- Jumlah pesanan
- Catatan pesanan
- Sumber pesanan/nomor TV atau meja
- Nama pelanggan
- Tanggal dan jam

Pengaturan disimpan per printer, sehingga printer dapur dan bar dapat memakai isi label yang berbeda.

## Perubahan pencetakan

- Cetak langsung Bluetooth/USB, RawBT, aplikasi Android, dan dialog cetak akan mengikuti pilihan field yang sama.
- Baris yang dimatikan tidak menyisakan baris kosong.
- Tanggal dan jam ditempatkan dalam satu baris.
- Tombol **Uji cetak** menampilkan hasil sesuai pengaturan printer tersebut.
- Pengaturan printer lama tetap dapat dibaca; nilai bawaan baru menghasilkan label empat baris di atas.

## Catatan teknis

- Tambahkan pengaturan layout label opsional pada data tiap printer.
- Gunakan satu penyusun isi label bersama untuk keluaran teks ESC/POS dan keluaran cetak sistem agar hasilnya konsisten.
- Tidak memerlukan perubahan tabel database.
