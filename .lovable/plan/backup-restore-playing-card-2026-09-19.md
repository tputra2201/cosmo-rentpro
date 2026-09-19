# Backup & Restore Playing Card

Menambahkan pengamanan data kartu (daftar kartu + saldo + riwayat transaksi kartu) di halaman Playing Card → Data & Saldo, supaya data tidak hilang karena kesalahan sistem atau kelalaian kasir.

## Yang akan dibuat

**Kotak baru "Backup & Restore Saldo Kartu"** di halaman Playing Card, di bawah daftar Data & Saldo:

- Tombol **Buat Backup Sekarang** — menyimpan salinan seluruh data kartu ke pusat (bisa dipakai dari perangkat mana saja), dan bisa juga diunduh jadi file Excel untuk simpanan pribadi.
- **Daftar 10 backup terakhir** — masing-masing menampilkan tanggal & jam, nama kasir/pelaku, jumlah kartu, total saldo, dan asal backup (otomatis saat closing / manual). Backup ke-11 otomatis menghapus yang paling lama.
- Tombol **Restore** pada setiap baris backup, dengan pilihan cara restore:
  - *Ganti semua data kartu* — data kartu & riwayat transaksi kartu dikembalikan persis seperti saat backup dibuat.
  - *Hanya tambah kartu yang hilang* — kartu yang hilang dikembalikan; kartu dan saldo yang ada sekarang tidak diubah.
- Tombol **Unduh** (Excel) dan **Hapus** pada setiap backup.
- Tombol **Pulihkan dari file** — memuat file backup Excel dari perangkat, lalu memakai dua pilihan cara restore yang sama.

**Backup otomatis saat closing shift.** Setiap kali kasir melakukan close out, satu backup kartu dibuat sendiri dan ditandai "otomatis (closing)". Kasir tetap bisa membuat backup manual kapan saja.

**Konfirmasi & catatan.** Restore, hapus backup, dan pulihkan dari file memakai kotak konfirmasi. Semua kegiatan (buat backup, restore, hapus backup) dicatat di Log Book beserta waktu, pelaku, jumlah kartu, dan total saldo.

**Hak akses.** Membuat/mengunduh backup boleh untuk semua level yang bisa membuka Playing Card. Restore dan hapus backup hanya untuk Manager ke atas (Manager, Installer, Developer) — bisa diatur di Setup → User → hak akses per level.

Backup bekerja saat internet mati (tersimpan lokal dulu), lalu ikut terkirim ke pusat saat internet kembali.

## Catatan teknis

- Jenis data sinkron baru `card_backup` di `LIST_KINDS` (`src/lib/sync-records.ts`) yang memetakan ke koleksi state baru `cardBackups: CardBackup[]`, sehingga backup ikut jalur sinkronisasi `store_data` yang ada — tidak perlu perubahan skema database.
- `CardBackup`: `{ id, createdAt, source: "manual" | "closing", actorId, actorName, cardCount, totalBalance, cards: PlayingCard[], entries: CardEntry[] }`. Disimpan di `src/lib/billing-store.tsx` bersama fungsi baru `createCardBackup(source)`, `restoreCardBackup(id, mode)`, `deleteCardBackup(id)`, dan pemangkasan otomatis ke 10 entri terbaru.
- `restoreCardBackup` mode `replace` mengganti `playingCards` + `cardEntries` dari backup; mode `merge` hanya menambahkan kartu yang `id`/nomor kartunya belum ada (memakai `normalizeCardKey`/`findCardByNumber`) beserta riwayat transaksi kartu tersebut.
- `closeShift` (billing-store) memanggil `createCardBackup("closing")` setelah close out sukses.
- Ekspor/impor file memakai `xlsx` dengan pola yang sama seperti `src/routes/_authenticated/backup.tsx` (sheet `Playing Card` dan `Transaksi Kartu`, nilai objek di-JSON-kan).
- Kunci hak akses baru pada `rolePermissions`: `card.backup.create`, `card.backup.restore`, `card.backup.delete`, ditampilkan di halaman Setup → User.
- Entri Log Book baru lewat helper log yang sudah ada.
