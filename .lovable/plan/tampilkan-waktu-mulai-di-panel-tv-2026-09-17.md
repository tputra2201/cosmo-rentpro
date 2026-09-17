# Tampilkan "Waktu mulai" di panel TV

## Tujuan
Saat sesi berjalan, panel TV menampilkan baris "Waktu mulai: [jam:menit:detik]" sehingga kasir tahu persis kapan pelanggan mulai main tanpa menghitung mundur dari timer.

## Perubahan (satu file)
`src/components/StationDialog.tsx` — bagian panel sesi aktif (di bawah nama pelanggan/paket, sekitar baris 634):

- Format `session.startAt` (timestamp) menjadi teks jam lokal `HH:mm:ss` dengan `toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", second: "2-digit" })`.
- Render: `<p>Waktu mulai: {jam}</p>` dengan gaya kecil senada dengan teks pelanggan di atasnya.
- Berlaku untuk mode prepaid dan open time; tidak mengubah logika, data, atau struk.

## Catatan
- Penghapusan additional rental sudah bisa dilakukan sekarang lewat ikon tong sampah di setiap baris additional rental (belum tercatat di Log Book — menunggu keputusan).
- Tanpa perubahan skema database.

## Verifikasi
- Type-check `bunx tsgo --noEmit` dan build OK.
- Playwright: buka panel TV sesi aktif, pastikan "Waktu mulai: HH:mm:ss" tampil dan jamnya benar.
