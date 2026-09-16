# Perangkat Terdaftar: Kunci di Halaman Masuk

Sekarang perangkat tak terdaftar masih bisa masuk tapi hanya bisa melihat. Ini diubah:
perangkat tak terdaftar **tidak bisa masuk sama sekali**, kecuali levelnya Manager,
Installer, atau Developer.

## Kode perangkat mudah didapat

Di halaman masuk, di bawah tombol Masuk, tampil baris kecil:

```text
Kode perangkat: 3A-1F-90-C2-77-0B   [Salin]
Alamat IP: 103.10.20.30             [Salin]
```

Jadi kasir di perangkat baru bisa langsung menyalin kodenya dan mengirimkannya ke
Manager/Installer untuk didaftarkan di Setup → Store → Perangkat yang Diizinkan.

## Aturan masuk

1. Kedua kolom (kode perangkat & daftar IP) di data store kosong → semua perangkat boleh masuk.
2. Ada isinya → hanya perangkat dengan kode terdaftar atau IP yang ada di daftar boleh masuk.
3. Level Manager, Installer, dan Developer selalu boleh masuk dari perangkat apa pun.
4. Ditolak → pengguna langsung dikeluarkan kembali ke halaman masuk dengan pesan:
   "Perangkat ini belum terdaftar di store. Minta Manager atau Installer mendaftarkan
   kode perangkat ini: XX-XX-…", lengkap dengan tombol salin.
5. Internet mati: dipakai keputusan terakhir yang tersimpan di perangkat itu — perangkat
   yang sebelumnya sudah pernah lolos tetap bisa masuk dan bertransaksi; perangkat yang
   belum pernah lolos ditolak.

Penguncian "hanya bisa melihat" yang ada sekarang tetap dipertahankan sebagai lapis
kedua (kalau data store baru terbaca setelah masuk).

## Rincian teknis

- `src/lib/device-guard.tsx`: pisahkan verdict menjadi `checked` (data store sudah
  terbaca) + `allowed`, dan ekspor helper `deviceVerdict()` yang bisa dipakai di luar
  React (baca cache `billing.device-allowed` + `billing.device-code`).
- Gate masuk dipasang di `src/routes/_authenticated/route.tsx` tidak cocok (butuh role +
  store). Gate ditaruh di komponen baru `src/components/DeviceGate.tsx` yang dirender di
  `__root.tsx` di dalam `DeviceGuardProvider`: bila `checked && !allowed && !privileged`,
  jalankan sign-out (cancelQueries → clear → `supabase.auth.signOut()` →
  `navigate({ to: "/auth", replace: true })`) dan simpan alasan penolakan di
  `sessionStorage` agar halaman masuk menampilkan pesannya.
- `src/routes/auth.tsx`: tambah blok kecil kode perangkat + IP (dari `deviceCode()` dan
  `/api/public/client-ip`) dengan tombol salin `navigator.clipboard`, plus banner merah
  bila ada alasan penolakan di `sessionStorage`.
- Pengecualian rute `/tv` (layar TV) dan `/auth` tetap tidak diganggu.
- Cache verdict tetap hanya ditulis saat data store benar-benar terbaca, supaya mode
  luring memakai keputusan terakhir.
