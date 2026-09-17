# Perbaikan Undangan Sandi dan Akses Store untuk Manager

## Hasil yang diinginkan

1. Pengguna yang membuka tautan undangan atau reset sandi dapat menyelesaikan pembuatan/penggantian kata sandi dari perangkat mana pun.
2. Pemeriksaan kode perangkat dan IP tetap berlaku saat pengguna benar-benar masuk untuk memakai aplikasi dan bertransaksi.
3. Manager dapat membuka **Setup → Store** milik store-nya sendiri untuk melihat informasi store, masa berlaku, mengatur jam operasional, serta mendaftarkan perangkat dan IP.

## Perubahan

### 1. Bebaskan halaman sandi dari pemeriksaan perangkat
- Jadikan `/atur-sandi` halaman pengecualian resmi pada `DeviceGate`, sama seperti `/auth`.
- Jangan mencatat penolakan perangkat, keluar otomatis, atau mengalihkan ke halaman login selama pengguna berada di halaman pembuatan/reset sandi.
- Pastikan tampilan aplikasi di `/atur-sandi` diperlakukan sebagai halaman publik khusus sandi, sehingga peringatan shift, masa aktif, dan penguncian menu tidak mengganggu proses tersebut.
- Setelah sandi berhasil disimpan, sesi tetap ditutup dan pengguna diarahkan ke halaman login seperti sekarang. Pemeriksaan perangkat baru berjalan ketika mereka mencoba masuk ke aplikasi.

### 2. Berikan akses Store kepada Manager
- Jadikan **menu Store** sebagai hak tetap untuk Manager, termasuk akun Admin lama, sehingga pengaturan hak akses lama tidak dapat menyembunyikannya lagi.
- Manager hanya membaca data store yang terhubung ke akunnya; tidak mendapat kemampuan berpindah atau melihat store lain.
- Pertahankan identitas store utama sebagai informasi baca-saja seperti sekarang.
- Manager dapat memakai pengaturan yang memang dibutuhkan di halaman tersebut: jam operasional, daftar kode perangkat, dan daftar IP.
- Logo store dan tindakan khusus Developer tetap memakai pembatasan yang ada; perubahan ini tidak memberi Manager akses ke Pusat Kontrol Developer.

## Pemeriksaan akhir
- Uji tautan undangan menuju `/atur-sandi` dari perangkat yang tidak terdaftar: formulir tetap tampil sampai sandi berhasil disimpan.
- Uji login biasa dari perangkat yang tidak terdaftar: tetap ditolak sesuai aturan store.
- Uji akun Manager: menu Store terlihat dan halaman dapat dibuka; jam operasional serta perangkat/IP dapat disimpan untuk store Manager tersebut.
- Uji Kasir/Finance/Operator: Store tetap tidak muncul kecuali memang diberi hak yang berlaku.
