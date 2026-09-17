# Pendaftaran Perangkat: Simpan yang Pasti & Penolakan yang Jelas

## Apa yang benar-benar terjadi

Dari data store: baris store **Demo Games** baru berubah (kode perangkat `39-84-1C-9E-5E-78`
"HP mami" masuk daftar) pada **10:16:17**, sedangkan akun kasir baru itu berhasil masuk
pertama kali pada **10:16:57** — sekitar 40 detik sesudahnya.

Artinya: selama percobaan-percobaan yang gagal, kode perangkat itu **belum benar-benar
tersimpan** di data store. Yang "men-trigger" bukan login di perangkat lama, tapi
penyimpanan daftar perangkat yang akhirnya berhasil dari perangkat lama itu.

Kenapa penyimpanan sebelumnya bisa gagal tanpa terlihat:

- Penyimpanan daftar perangkat hanya menyentuh store tempat orang yang menyimpan
  terdaftar. Kalau yang menyimpan sedang terikat ke store lain (mis. akun Developer yang
  masih menunjuk store lain), perintahnya berhasil tapi **nol baris berubah** — layar tetap
  menampilkan "tersimpan".
- Setelah menyimpan, layar Store tidak membaca ulang isi yang tersimpan, jadi tidak ada
  bukti bahwa kode itu memang sudah masuk.

## Yang akan diperbaiki

1. **Simpan = terbukti tersimpan.** Setelah menyimpan daftar perangkat/IP, aplikasi membaca
   ulang data store dan membandingkan hasilnya. Kalau tidak sama (atau tidak ada satu pun
   baris yang berubah), muncul peringatan merah: "Daftar perangkat belum tersimpan — akun
   ini terdaftar di store lain", bukan pesan sukses.
2. **Nama store terlihat saat mendaftarkan.** Di panel Perangkat yang Diizinkan ditulis
   jelas: "Perangkat di bawah berlaku untuk store: <nama store>", supaya tidak salah store.
3. **Penolakan di halaman masuk menyebut alasannya.** Pesan merah menampilkan: kode
   perangkat ini, alamat IP-nya, dan nama store yang menolak, plus tombol salin — jadi
   Manager tahu persis apa yang harus didaftarkan.
4. **Jangan menolak sebelum yakin.** Perangkat hanya dikeluarkan setelah data store benar-
   benar terbaca dari internet (bukan salinan lama) dan level pengguna sudah diketahui.
   Ini juga menutup celah Manager/Installer yang kadang ikut terlempar karena levelnya
   belum selesai terbaca.
5. **Catatan penolakan.** Setiap penolakan perangkat dicatat di Log Book (waktu, akun, kode
   perangkat, IP), supaya kejadian seperti ini bisa dilihat tanpa menebak.

Tidak ada perubahan aturan akses: perangkat tak terdaftar tetap tidak boleh masuk kecuali
Manager, Installer, atau Developer.

## Rincian teknis

- `store_set_device_access` (RPC) diubah agar mengembalikan jumlah baris yang di-update
  (`returns int`), sehingga nol baris bisa dilaporkan sebagai kegagalan.
- `src/routes/_authenticated/store.tsx`: `saveAsManager()` memeriksa nilai balik RPC lalu
  memuat ulang baris store dan membandingkan `allowed_devices`/`allowed_ips`; toast sukses
  hanya jika cocok. Header panel menampilkan nama store aktif.
- `src/lib/device-guard.tsx`: bedakan `checked` (baris store terbaca dari jaringan) dari
  salinan cache; tambah `roleReady` (dari `useAuth().loading`/`role !== null`) sebagai syarat
  penolakan; simpan alasan penolakan (`code`, `ip`, `storeName`) lewat `setDeviceReject`.
- `src/lib/store-info.ts`: tandai sumber data (`fromCache`) agar guard tahu itu salinan lama.
- `src/components/DeviceGate.tsx`: tunggu `checked && roleReady` sebelum sign-out; catat ke
  Log Book sebelum keluar.
- `src/routes/auth.tsx`: banner penolakan menampilkan kode perangkat, IP, dan nama store.
