# Rekap atas Kas Lain & Pengeluaran ikut hari usaha

## Asal angkanya

Angka di rekap atas bukan salah hitung — itu catatan kas dini hari yang masih milik hari usaha kemarin, tapi dihitung sebagai "hari ini" karena rekap atas memakai tanggal kalender.

Yang tercatat di store Cosmo Gaming DT:
- 18 Sep 02.55 — Uang Makan Rp 120.000 (uang keluar)

Di store Demo Games ada pula catatan sore/malam 17 Sep (Top Up Playing Card, Pengambilan Uang Owner, Belanja Bahan Kafe, Kasbon Karyawan) yang muncul di rekap saat masuk lewat tengah malam.

Jadi begitu jam melewati tengah malam, rekap atas langsung "berpindah hari", padahal shift-nya masih hari usaha yang sama. Sebaliknya transaksi dini hari milik hari kemarin ikut terhitung.

## Yang akan diperbaiki

- Rekap atas dihitung memakai **hari usaha** (jam buka sampai jam tutup dini hari, sesuai Setup → Store → Jam Operasional) — sama seperti tab Riwayat dan Reports.
- Label kartu diubah supaya jelas periodenya: "Pendapatan lain hari usaha ini", "Pengeluaran hari usaha ini", dan dua kartu perpindahan kas tetap dengan periode yang sama.
- Di bawah judul halaman ditampilkan keterangan periode hari usaha yang sedang dihitung, jadi tidak ada lagi tebak-tebakan angka itu milik tanggal mana.

Tidak ada catatan kas yang diubah atau dihapus, dan tidak ada perubahan pada basis data.

## Catatan teknis

- `src/routes/_authenticated/kas.tsx` — `KasPage`: ganti filter `new Date(e.createdAt).toDateString() === todayKey` dengan `inRange(e.createdAt, defaultRange("day", operatingHours))` dari `src/lib/report-range.ts`, ambil `operatingHours` dari `useBilling()`, dan tampilkan `rangeLabel(range)` di header.
- Perhitungan `incomeToday` / `expenseToday` / `payoutIn` / `payoutOut` tetap sama, hanya sumber barisnya yang mengikuti hari usaha.
