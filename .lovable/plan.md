# Uang kas awal check-in salah ambil shift lama

## Apa yang terjadi

Saat close out, kasir Adi mengisi "next start cash" **Rp 289.000** dan nilainya
memang tersimpan benar di pusat (shift ditutup 19 Sep 18:59, next start 289.000).

Tapi layar check-in menampilkan **Rp 368.000**. Angka itu berasal dari shift lain
yang jauh lebih lama (shift Audhy yang ditutup 17–18 Sep, next start 368.000).

Penyebabnya: layar check-in mengambil "shift terakhir yang ditutup" berdasarkan
urutan daftar shift di perangkat, bukan berdasarkan waktu penutupan. Setelah data
disinkronkan dari pusat, urutan daftar itu bisa berubah/teracak, sehingga yang
terbaca sebagai "terakhir" justru shift lama.

## Perbaikan

1. Layar check-in memilih shift yang **waktu tutupnya paling baru**, bukan yang
   pertama ditemukan di daftar. Jadi uang kas yang harus ada di laci selalu
   mengikuti close out terakhir (Rp 289.000 pada kasus ini).
2. Kolom "Uang kas awal (hitung fisik)" ikut menyesuaikan kalau angka anjuran
   berubah setelah data tersinkron — sekarang nilainya terkunci pada angka saat
   layar pertama dibuka.
3. Tabel "Riwayat shift" diurutkan dari yang terbaru ke yang lama, supaya kasir
   dan manager melihat urutan yang konsisten di semua perangkat.

## Catatan teknis

- `src/routes/_authenticated/shift.tsx`: ganti `shifts.find((s) => s.closedAt)`
  dengan pemilihan `closedAt` maksimum; urutkan salinan `shifts` berdasarkan
  `openedAt` desc untuk tabel riwayat; sinkronkan state `startCash` di
  `CheckInCard` dengan prop `suggested` (efek saat `suggested` berubah).
- Tidak ada perubahan pada logika penyimpanan close out (`closeShift`) maupun
  skema data — data yang tersimpan sudah benar, hanya pembacaannya yang salah.

## Temuan tambahan (di luar perbaikan ini)

Di pusat masih ada satu shift lama (kasir Viona, dibuka 19 Sep 02:13) yang tidak
punya waktu tutup. Ini bisa membuat perangkat lain menolak check-in baru dengan
pesan "masih ada shift yang belum ditutup". Bisa saya tangani menyusul kalau
memang ingin dibereskan.
