# Perbaikan notifikasi waktu habis di Dashboard

## Tujuan
Notifikasi waktu habis yang sudah dikonfirmasi tidak muncul lagi hanya karena pengguna berpindah tab lalu kembali ke Dashboard.

## Perubahan
- Hapus pemicu alarm dan toast duplikat yang khusus hidup di halaman Dashboard. Pemicu ini kehilangan ingatannya setiap kali halaman Dashboard dibuka ulang.
- Gunakan satu sistem notifikasi global yang sudah mengidentifikasi sesi berdasarkan TV dan waktu mulai sesi.
- Pertahankan konfirmasi **OK** untuk seluruh masa sesi tersebut; notifikasi baru hanya boleh muncul untuk sesi baru dengan waktu mulai baru.
- Pastikan alarm berulang berhenti setelah **OK**, tetapi tetap dapat muncul untuk TV lain yang waktunya benar-benar baru habis.

## Verifikasi
- Biarkan satu sesi mencapai `00:00`, lalu tekan **OK**.
- Berpindah antara Dashboard dan beberapa menu; notifikasi sesi yang sama tidak boleh muncul kembali.
- Mulai sesi baru dan pastikan notifikasi tetap muncul saat sesi baru habis.
