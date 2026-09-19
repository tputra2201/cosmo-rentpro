# Nomor kartu dari pembaca USB dicocokkan dengan data NFC Tools

## Kenapa nomornya beda

Ada dua nomor berbeda pada satu kartu yang sama:

- **Teks yang direkam dengan NFC Tools** (yang tampil di tablet ber-NFC bawaan). Ini isi tulisan di dalam kartu.
- **Nomor seri chip (UID)** — angka/huruf yang selalu diketik oleh pembaca kartu USB.

Pembaca USB bekerja seperti keyboard: ia hanya bisa mengetik nomor seri chip. Ia tidak bisa membuka isi tulisan di dalam kartu, dan browser tidak punya cara meminta isi itu darinya. Jadi memunculkan teks NFC Tools lewat pembaca USB tidak mungkin.

Solusinya: satu kartu boleh dikenali oleh dua nomor sekaligus, sehingga tap dengan alat apa pun menemukan pemegang kartu yang sama.

## Yang akan dibuat

1. **Kolom baru "Nomor seri chip (UID)" pada data kartu** di halaman Playing Card, bersebelahan dengan nomor kartu dan kode kartu.
2. **Pencarian kartu diperluas**: saat nomor diketik/ditempel, sistem mencocokkan ke nomor kartu, kode kartu, maupun nomor seri chip. Jadi tap dari pembaca USB dan tap dari tablet ber-NFC bawaan sama-sama menemukan kartu itu.
3. **Belajar otomatis (sekali tap)**: jika nomor yang terbaca belum dikenal, muncul pilihan "Nomor ini milik kartu mana?" — kasir pilih kartu dari daftar, dan nomor seri chip langsung disimpan ke kartu itu. Tap berikutnya langsung dikenali. Tercatat di Log Book.
4. **Pendaftaran cepat di halaman Playing Card**: pada panel detail kartu ada tombol "Rekam nomor seri chip" — tempel kartu ke pembaca USB, nomornya terisi dan disimpan. Cara termudah mendaftarkan seluruh kartu yang sudah ada sekali jalan.
5. **Tampilan**: panel pembayaran menampilkan nomor kartu, kode, dan nomor seri chip agar jelas nomor mana yang terbaca.

## Catatan

- Kartu lama tetap berfungsi seperti sekarang; nomor seri chip bersifat tambahan dan bisa diisi bertahap saat kartu dipakai.
- Tetap tidak mungkin: membaca isi tulisan NFC Tools dari pembaca USB/Bluetooth.

## Teknis

- `PlayingCard` + field opsional `cardUid`; `findCardByNumber` mencocokkan `cardNumber`, `cardCode`, dan `cardUid` (case-insensitive, buang spasi/titik dua).
- Aksi store baru `setCardUid(cardId, uid)` dengan penolakan bila UID sudah dipakai kartu lain, disertai `withLog`.
- Form tambah/edit kartu di `src/routes/_authenticated/kartu.tsx` mendapat kolom UID + tombol rekam memakai `CardScanInput`.
- `CardPaymentPanel`: saat kartu tidak ditemukan, tampilkan pemilih kartu untuk menautkan UID (dibatasi hak akses `kartu.jual`/pengelola kartu yang sudah ada).
- Sinkronisasi: sertakan `cardUid` di payload kartu pada `src/lib/sync-records.ts`; tidak ada perubahan skema database (kartu disimpan sebagai data store yang sudah ada).
