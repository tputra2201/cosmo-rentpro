# Perbaikan Data Store, Setup, Playing Card, dan Pemesanan

## 1. Data Store
- Hapus keterangan "Tampil di pojok kiri atas, contoh: v1.0" di bawah kolom versi aplikasi.
- Bagian Perangkat yang Diizinkan boleh diubah oleh Manager dan Installer (bukan hanya Developer).
- Allowed IP mendukung pola berakhiran bintang, contoh `192.168.80.*`, sehingga semua IP dengan awalan itu diterima. Akses diberikan bila: pola/IP cocok, kode perangkat terdaftar, atau level Manager/Installer/Developer. Selain itu ditolak.

## 2. Tampilan Setup dan Report
- Judul utama tiap baris data di Setup (jenis konsol, nomor TV, nama menu, nomor meja, dll.) dibuat lebih tebal dengan warna aksen yang mencolok.
- Judul dan sub judul semua Report memakai gaya tebal beraksen yang sama.

## 3. Setup berbentuk tabel + panel detail
Untuk Kafe (menu), Membership, Playing Card, dan User:
- Daftar disederhanakan menjadi tabel ringkas (kolom inti saja).
- Di ujung baris ada tombol hapus dan tombol edit/detail.
- Tombol edit/detail membuka panel berisi seluruh pengaturan lengkap item tersebut (termasuk Modifier, harga, label printer, dsb. untuk menu).

## 4. Playing Card — Data & Saldo
- Tabel ringkas seluruh pemegang kartu (kode kartu, nama, saldo, status).
- Tombol detail membuka panel berisi data lengkap kartu plus riwayat transaksinya (pembelian, top up, pemakaian).

## 5. Panel pembayaran TV
- Additional Rental diubah menjadi daftar pilihan (dropdown) agar panel lebih ringkas; item terpilih tampil sebagai baris tagihan yang bisa dihapus.

## 6. Card TV dan meja kafe
- Nama pelanggan default "Umum" sehingga daftar saran tidak langsung terbuka menutupi layar.
- Saat huruf diketik, muncul daftar pelanggan terdaftar yang namanya berawalan sama. Tidak ada opsi menambah pelanggan baru dari sini; penambahan hanya lewat menu Membership.
- Card meja kafe hanya menampilkan nama dan daftar pesanan (bila sudah ada).
- Penambahan pesanan lewat tombol "+ Tambah Order" (sama seperti TV card) yang membuka panel pemesanan.
- Panel pemesanan punya tombol "Sent Order" sebagai konfirmasi. Menutup panel tanpa menekan tombol itu membatalkan seluruh pesanan yang sedang disusun. Berlaku untuk TV card dan meja kafe.
- Pesanan yang sudah dikirim masuk ke daftar order di card. Menghapus order dicatat di Log Book.

## Catatan teknis
- Pencocokan IP: dukungan wildcard akhir (`*`) di `device-guard`, dievaluasi bersama kode perangkat dan level pengguna.
- Izin ubah perangkat memakai pemeriksaan level yang sudah ada (`installer`, `manager`, `admin`).
- Panel pemesanan memakai keranjang sementara (draft) di komponen dialog; commit ke sesi/meja hanya saat "Sent Order".
- Penghapusan order memakai pencatatan Log Book yang sudah tersedia (`withLog`).
- Gaya judul memakai token warna aksen yang ada di styles.css, bukan warna keras.
