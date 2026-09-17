# Perangkat dihapus dari store → langsung keluar

## Masalah

Sekarang daftar perangkat yang diizinkan hanya dibaca satu kali, yaitu saat aplikasi baru dibuka. Jadi kalau Manager/Installer menghapus sebuah kode perangkat, kasir di perangkat itu tetap bisa memakai aplikasi sampai dia menutup dan membuka ulang aplikasinya.

## Yang akan dibuat

- Data store (termasuk daftar perangkat dan pola IP) diperiksa ulang secara berkala selama aplikasi dipakai, dan juga setiap kali jendela aplikasi kembali aktif atau internet tersambung lagi.
- Begitu perangkat sudah tidak ada di daftar, pengguna langsung dikeluarkan ke halaman masuk dengan keterangan yang sudah ada sekarang: nama store, kode perangkat, dan alamat IP-nya — dan tercatat di Log Book.
- Izin yang tersimpan di perangkat ikut dihapus, jadi saat internet mati perangkat itu tidak bisa lagi "lolos" memakai izin lama.
- Manager, Installer, dan Developer tetap tidak terpengaruh; layar TV dan halaman masuk juga dibiarkan apa adanya.

Jeda pemeriksaan: 30 detik.

## Catatan teknis

- `src/lib/store-info.ts`: `useStoreInfo` mendapat pemuatan ulang berkala (`setInterval` 30s) plus pemicu pada event `visibilitychange` dan `online`. Fungsi pembaca dipisah agar bisa dipanggil ulang; hasil gagal (luring) tidak menimpa data lama dan tidak mengubah `fresh` menjadi salah.
- `src/lib/device-guard.tsx`: saat data segar menunjukkan perangkat tidak diizinkan, penanda `billing.device-allowed` di localStorage dihapus/di-set `no` (perilaku set sudah ada, dipastikan berjalan juga sesudah pemuatan ulang).
- `src/components/DeviceGate.tsx`: logika penolakan sudah benar; hanya `kicking` ref yang perlu tetap mencegah pengeluaran ganda. Tidak ada perubahan skema database dan tidak ada perubahan alur bisnis lain.
