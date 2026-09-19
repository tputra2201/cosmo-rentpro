# Meja kafe terisi: warna kotak & label berbeda agar jelas

## Masalah
Kartu meja kafe yang terisi (ada pesanan / sesi terbuka) tampil hampir sama dengan meja kosong — hanya garis tepi `border-primary/50`. Kasir sulit melihat sekilas meja mana yang terisi.

## Perubahan (src/components/CafeTables.tsx, bagian kartu meja ±baris 477–541)

Mengikuti pola kartu TV yang sudah disepakati (StationCard):

1. **Kotak kartu** — saat `filled`:
   - ganti `border-primary/50` menjadi `border-accent/60 glow-accent` (garis hijau neon + glow, sama seperti TV "Sedang Main").
   - Meja kosong tetap panel biasa tanpa perubahan.
2. **Label nama meja** — saat `filled` warna nama berubah dari `text-primary` (biru) menjadi `text-accent` (hijau neon), konsisten dengan warna nama TV saat bermain. Meja kosong tetap biru.
3. Badge "Terisi"/"Kosong" dan "Lunas" tidak diubah.

Semua warna memakai token tema yang ada (`--accent`, `--glow-accent`), jadi ikut benar di semua tema (Gelap, Kuning, Berwarna, Cosmo).

## Verifikasi
- Build `bunx tsgo --noEmit` tanpa error.
- Cek cepat tampilan kartu meja di preview (Playwright) untuk memastikan kontras terlihat.
