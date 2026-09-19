# Perbaikan "Excel ke Drive" ditolak Google (401)

## Jawaban atas pertanyaan Anda

Menghubungkan Google Drive seharusnya **cukup sekali dan permanen** — tidak perlu diulang rutin. Namun Google bisa mencabut izin secara otomatis dalam beberapa kondisi:

- Aplikasi penghubung masih berstatus "testing" di sisi Google — izinnya otomatis kedaluwarsa tiap **7 hari** (ini kemungkinan besar penyebab kasus Anda).
- Akun Google berganti sandi, atau izin dicabut dari pengaturan keamanan akun Google.
- Sambungan tidak dipakai dalam waktu sangat lama (sekitar 6 bulan).

Jadi: sambungkan ulang **sekali sekarang**. Kalau setelah itu dalam ±1 minggu ditolak lagi, berarti penyebabnya status "testing" di atas dan perlu langkah tambahan satu kali di sisi Google.

## Langkah perbaikan

1. **Hubungkan ulang Google Drive** lewat kartu sambungan di chat ini (sekali klik, pilih akun Google yang sama). Setelah itu "Excel ke Drive" langsung bisa dipakai lagi — tidak ada data laporan yang hilang, karena kegagalan hanya terjadi saat mengirim file.

2. **Perbaiki pesan kesalahan di aplikasi** (`src/lib/drive-export.functions.ts`): jika Google menolak dengan 401 (izin kedaluwarsa), tampilkan pesan singkat yang bisa dipahami kasir — misalnya *"Sambungan Google Drive kedaluwarsa. Minta pemilik akun menghubungkan ulang di Lovable."* — bukan teks teknis panjang seperti sekarang.

## Catatan teknis

- Sambungan "Taufiq's Google Drive" terkonfirmasi kedaluwarsa (`refresh token expired`, dicek langsung ke server Google).
- Penyimpanan laporan lokal (tombol Excel biasa) tidak terpengaruh dan tetap berfungsi.
- Tidak ada perubahan skema database.
