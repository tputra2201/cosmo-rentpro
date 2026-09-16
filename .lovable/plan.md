# Setup & Reports: dari kartu besar menjadi tabel baris

Semua daftar di Setup masih menampilkan seluruh detail satu item sekaligus, sehingga satu baris data memakan banyak ruang. Rencananya: setiap daftar jadi tabel ringkas satu baris per item, dengan tombol detail di ujung baris yang membuka panel berisi seluruh pengaturan item tersebut.

## Pola yang dipakai di semua halaman

- Tabel dengan kolom inti saja (nama/nomor, kategori, harga/nilai, status).
- Di ujung tiap baris: tombol detail (buka panel) dan tombol hapus.
- Panel detail terbuka sebagai panel samping/dialog berisi semua kolom lengkap item itu, termasuk pengaturan lanjutan.
- Judul kolom tebal beraksen; judul halaman dan sub judul memakai gaya tebal beraksen yang sama.
- Di layar HP tabel bisa digeser ke samping; kolom penting tetap terlihat.
- Urutan item tetap bisa diatur (drag) lewat pegangan di kolom pertama.
- Tambah item baru tetap lewat baris/form singkat di atas atau bawah tabel.

## Halaman Setup yang diubah

| Halaman | Kolom tabel | Isi panel detail |
| --- | --- | --- |
| Kafe — Menu | Nama, kategori, harga, cetak label | Harga, kategori, diskon Playing Card & member, printer label, Modifier (varian, ukuran, topping, opsi lain) |
| Kafe — Meja | Nomor meja, area, kursi | Semua field meja |
| Setup Price | Jenis konsol, tarif, status | Tarif per jam, paket, diskon, Additional Rental |
| Membership | Nama, nomor HP, level/diskon | Data lengkap pelanggan + ringkasan transaksi |
| Playing Card | Kode kartu, nama, saldo, status | Data kartu lengkap + riwayat transaksi (pembelian, top up, pemakaian) |
| User | Nama, email, level, status | Level, hak akses, perangkat, waktu aktif terakhir, aksi akun |
| Payment | Nama tipe, status aktif, total hari ini | Nama, status, catatan |
| Promo | Nama promo, jenis, nilai, status | Semua syarat & periode promo |
| Printer | Nama, peran, status | Alamat, peran, ukuran kertas, uji cetak |
| Finance (kategori kas) | Nama kategori, jenis | Detail kategori |
| Store | Nama store, jam operasional | Identitas store, jam operasional, perangkat & Allowed IP |

## Reports

- Bagian yang masih berbentuk kartu ringkasan diubah jadi tabel: Statistik Penjualan (TV & meja, konsol, menu, tanggal, hari, jam), Card Report, Membership Report, dan Log Book.
- Kartu angka total tetap dipertahankan hanya untuk ringkasan atas (total pendapatan, jumlah nota), karena itu bukan daftar record.
- Baris nota/transaksi yang punya rincian mendapat tombol detail yang membuka panel rincian, bukan menampilkan semuanya langsung.

## Catatan teknis

- Satu komponen tabel bersama (`SetupTable` + `DetailSheet`) dipakai ulang di semua halaman Setup, dibangun di atas `src/components/ui/table.tsx` dan `sheet.tsx`.
- Drag-reorder tetap memakai `SortableArea`/`SortableItem` yang sudah ada, dipasang pada baris tabel.
- Panel detail hanya membaca dan menulis lewat fungsi store yang sudah ada (`updateMenuItem`, `updateCafeTable`, `updateUser`, dst.) — tidak ada perubahan logika bisnis maupun skema database.
- Gaya judul memakai token warna aksen di `styles.css`, tidak ada warna keras.
- Pengerjaan bertahap: komponen bersama dulu, lalu Kafe, Playing Card, Membership, User, sisa halaman Setup, terakhir Reports.
