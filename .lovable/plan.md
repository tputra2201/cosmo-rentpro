# Jenis Konsol & Tarif per Jam tidak boleh kembali ke pengaturan bawaan

## Apa yang terjadi

Log Book hari ini memperlihatkan pola pemulihan manual: di Cosmo Gaming DT pukul 05.37 tercatat "Hapus jenis konsol PS3", lalu "Ubah tarif konsol PS4 13000", "PS5 20000", "Tambah jenis konsol VIP" — persis pekerjaan mengembalikan daftar yang baru hilang. Di Cosmo Gaming TS masih tertinggal jejaknya: daftar tarif di pusat sekarang berisi PS3 5.000 dan PS5 12.000, dua angka bawaan yang tidak pernah dipakai store itu.

Jadi yang terjadi bukan tampilan salah, tapi daftar bawaan (PS3/PS4/PS5) benar-benar terkirim ke pusat dan menimpa daftar asli, lalu ikut tersebar ke semua perangkat store itu.

## Penyebab

Tiga hal saling menumpuk:

1. Semua data satu store disimpan di satu tempat penyimpanan browser. Kalau penyimpanan penuh atau tulisannya terpotong, aplikasi diam saja dan pada pembukaan berikutnya kembali memakai daftar bawaan.
2. Jejak "sudah pernah sinkron" disimpan terpisah dan tetap ada walau data utamanya sudah hilang. Karena jejaknya ada, aplikasi menyimpulkan perangkat ini sudah punya data terbaru dan melewati tahap ambil-ulang penuh dari pusat.
3. Perangkat lalu membandingkan isi bawaan dengan catatan terakhirnya, menganggap daftar konsol "baru diubah", dan mengirimkannya ke pusat.

Satu perangkat yang penyimpanannya bermasalah cukup untuk mereset daftar konsol seluruh store.

## Perbaikan

- Perangkat yang membuka aplikasi tanpa data tersimpan yang sah wajib mengambil ulang seluruh data store dari pusat lebih dulu, dan tidak boleh mengirim apa pun sebelum pengambilan itu selesai — walaupun jejak sinkron lamanya masih ada.
- Pengaturan yang isinya sama dengan daftar bawaan (PS3/PS4/PS5 beserta tarifnya) tidak akan pernah dikirim ke pusat kalau perangkat itu belum menerima data store pada sesi tersebut.
- Daftar Jenis Konsol & Tarif hanya dikirim ke pusat bila memang diubah dari halaman Setup Price di perangkat itu, bukan karena terlihat berbeda dari catatan lama.
- Penyimpanan lokal dibuat lebih tahan penuh: bila gagal menyimpan, aplikasi menyimpan ulang tanpa Log Book lama dan riwayat lama (data itu tetap aman di pusat), dan menampilkan peringatan sekali agar kasir tahu perangkatnya perlu diperiksa.
- Setiap kali daftar konsol berubah karena data dari pusat, dicatat di Log Book, sehingga kalau hal serupa muncul lagi jelas terlihat perangkat mana penyebabnya.

Daftar konsol dan tarif yang tersimpan sekarang tidak diubah oleh perbaikan ini.

## Catatan teknis

- `src/lib/billing-store.tsx`
  - Hidrasi menandai hasilnya: `storageLoaded` (ada snapshot sah) vs gagal parse/kosong. Nilai ini diteruskan ke `useStoreSync`.
  - Efek simpan: tangkap kegagalan `setItem`, coba ulang dengan snapshot ringkas (`logEntries` dan `history` dipangkas ke N terbaru), set penanda `storagePressure` untuk toast peringatan sekali.
  - Tandai pengaturan yang benar-benar diedit: set `dirtySettings: string[]` (atau ref di provider) saat `setRates`, `addConsoleType`, `renameConsoleType`, `updateConsoleRate`, `removeConsoleType`, `setConsoleDiscount` dipanggil; disimpan bersama state agar tahan reload.
- `src/lib/store-sync.ts`
  - Jalur bootstrap (baris ~349): pintasan `hasSyncHistory` hanya berlaku bila `storageLoaded` true. Bila false, hapus `SHADOW_KEY`/`SINCE_KEY`, set `FRESH_KEY`, dan wajibkan pengambilan penuh sebelum `setReadyStoreId`.
  - `queueLocalChanges`: untuk `kind === "settings"` dengan `entity_id` di `{consoleTypes, rates, consoleDiscounts}`, lewati bila (a) belum ada pengambilan penuh pada sesi ini, atau (b) payload identik dengan nilai bawaan `defaultState`, atau (c) kunci itu tidak ada di `dirtySettings`.
  - Tambahkan pencatatan Log Book ringkas saat `applyRecords` mengubah `rates`/`consoleTypes` dari pusat.
- `src/lib/sync-records.ts`: ekspor daftar kunci pengaturan yang dilindungi agar dipakai bersama oleh pengecekan di atas.
- Tanpa perubahan skema database.
