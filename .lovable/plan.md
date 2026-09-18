# Auto logout yang aman, promo baru, dan gabung tagihan

## 1. Auto logout bisa diatur

Di **Setup → Store** ditambah bagian **Keamanan sesi**:

- Isi berapa menit tanpa aktivitas sebelum keluar otomatis (bawaan 5 menit).
- Pilihan **matikan keluar otomatis**.
- Nilainya berlaku untuk seluruh perangkat store itu.

Timer rental **tidak ikut berhenti**. Waktu mulai dan durasi sesi tersimpan, jadi
saat kasir masuk kembali sisa waktunya tetap berjalan sesuai jam sebenarnya.

## 2. Alarm waktu habis tetap terdengar di halaman masuk

- Saat sesi rental habis waktunya, muncul kotak peringatan berisi nomor TV, nama
  pelanggan, dan tombol **OK** — termasuk ketika layar sedang di halaman masuk
  karena keluar otomatis.
- Nada alarm dipilih dari daftar bawaan (bip, bel, sirine, lonceng) di
  Setup → Store, lengkap dengan tombol **Coba nada** dan pilihan
  nyala/mati serta berulang atau sekali.
- Catatan: beberapa browser baru mengeluarkan suara setelah layar pernah
  disentuh/diklik sekali. Kalau suara diblokir, kotak peringatan tetap muncul.

## 3. Jenis promo

Form promo mendapat pilihan **Jenis promo**, dan setiap jenis punya kolomnya sendiri:

| Jenis | Isi yang diatur | Cara berlaku |
| --- | --- | --- |
| Diskon | Persen / nominal, minimal transaksi, maks. diskon | Seperti sekarang |
| Bonus jam rental | Bayar X jam, dapat Y jam | Durasi sesi ditambah tanpa menambah tagihan |
| Buy one get one (kafe) | Menu yang dibeli, menu gratisnya, kelipatan | Saat pesanan dikirim, menu gratis masuk otomatis harga 0 |
| Main X jam dapat menu gratis | Minimal jam main, menu hadiah, jumlah | Hadiah masuk pesanan sesi otomatis harga 0 |

Aturan bersama: periode tanggal & jam, aktif/nonaktif, otomatis atau dipilih
kasir, dan hanya berlaku sekali per sesi. Baris gratis diberi tanda **Promo**
pada panel, bill, struk, dan label, dan setiap pemberian promo tercatat di
Log Book serta laporan (nilai hadiah dihitung sebagai promo, bukan penjualan).

## 4. Gabung dan titip tagihan

Di panel pembayaran TV dan meja kafe ditambah tombol **Gabung Tagihan**:

- **TV + TV** → satu nota gabungan. Semua sesi yang dipilih ditutup bersama,
  satu struk, rincian tetap terpisah per TV di dalam nota.
- **TV + meja kafe** → meja kafe dititipkan ke TV induk; pesanannya muncul di
  panel TV induk dan dibayar dari sana.
- Sebelum digabung ditampilkan ringkasan: apa saja yang ikut dan total barunya,
  dengan konfirmasi.
- Tersedia tombol **Lepas gabungan** selama belum dibayar.
- Penggabungan dan pelepasan tercatat di Log Book; laporan per TV/meja dan
  statistik tetap memakai asal transaksinya.

## Catatan teknis

- Tanpa perubahan skema basis data. Pengaturan idle + alarm masuk pengaturan
  store yang sudah ada (ikut sinkronisasi seperti Jam Operasional), tipe
  `Promotion` diperluas dengan `kind` dan kolom opsional per jenis, sesi
  mendapat penanda `mergedInto` / `mergedIds`.
- `IdleLogout` membaca menit dari pengaturan store (0 = nonaktif) dan tetap
  menunda saat internet mati.
- Alarm dibuat dengan nada bawaan (Web Audio), jadi tidak ada berkas suara yang
  perlu diunggah, dan komponen alarm dipasang di kerangka utama agar juga hidup
  di halaman masuk.
- Promo baru dihitung di `sessionBill` dan pengiriman pesanan kafe; laporan &
  struk memakai jalur perhitungan yang sudah ada.
