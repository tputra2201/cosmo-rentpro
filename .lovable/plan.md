# Excel ke Drive milik masing-masing store

## Jawaban singkat

Ya — sekarang semua laporan "Excel ke Drive" masuk ke **satu Drive yang sama** (akun cosmogaming.id@gmail.com), hanya dipisah per folder: `RenToPlay Reports / <nama store>`. Email di data store belum dipakai sama sekali untuk tujuan penyimpanan.

## Yang akan dibuat

Setiap store menghubungkan **akun Google miliknya sendiri**, sekali saja, lalu semua laporan Excel dari store itu tersimpan di Drive akun tersebut.

1. **Halaman Setup → Store: bagian "Google Drive Store"**
   - Menampilkan status: belum terhubung / terhubung sebagai (nama akun Google) / perlu dihubungkan ulang.
   - Tombol "Hubungkan Google Drive" membuka jendela izin Google. Manager/Installer login dengan akun Google store tersebut (disarankan email yang sama dengan Email Store), lalu memberi izin.
   - Tombol "Putuskan sambungan" untuk mengganti akun.
   - Hanya level Manager ke atas yang boleh mengatur (mengikuti hak akses Store yang sudah ada).

2. **Tombol "Excel ke Drive" di laporan**
   - Mengirim berkas ke Drive milik store yang sedang aktif, folder `RenToPlay Reports / <nama store>`.
   - Kalau store belum menghubungkan Drive: pesan jelas "Store ini belum menghubungkan Google Drive. Buka Setup → Store untuk menghubungkan."
   - Kalau izin akun store kedaluwarsa: pesan "Sambungan Google Drive store ini perlu dihubungkan ulang di Setup → Store."

3. **Sambungan pusat yang sekarang** tetap dipakai sebagai cadangan untuk store yang belum menghubungkan akunnya sendiri, supaya tidak ada yang mendadak tidak bisa ekspor.

## Catatan teknis

- Memakai **Google Drive App User Connector** (`google_drive`) dengan alur OAuth per pengguna; satu OAuth client Google milik workspace dipakai semua store. Redirect URI yang perlu terdaftar di Google Console: `https://connector-gateway.lovable.dev/api/v1/app-users/oauth2/callback`.
- Scope: `userinfo.email`, `userinfo.profile`, `https://www.googleapis.com/auth/drive.file` (hanya berkas yang dibuat aplikasi).
- Migrasi Lovable Cloud: tabel baru `public.store_drive_connections` (`store_id uuid unique`, `connector_id text`, `connection_key_ciphertext text`, `google_email text`, `connected_by uuid`, timestamps). GRANT hanya ke `service_role`, RLS aktif tanpa policy publik — hanya server function yang mengakses. Kunci sambungan dienkripsi AES-256-GCM dengan `APP_USER_CONNECTION_KEY_SECRET`.
- Kunci disimpan per **store**, bukan per user, sehingga semua kasir store itu memakai Drive yang sama. `app_user_id` untuk gateway tetap memakai UUID user Supabase yang melakukan proses menghubungkan.
- File baru: `src/integrations/lovable/appUserConnector.ts` (server-only helper sesuai standar), `src/lib/store-drive.server.ts` (simpan/ambil/enkripsi), `src/lib/store-drive.functions.ts` (status, mulai OAuth, tukar kode, putuskan), route `src/routes/oauth/google-drive/return.tsx` (halaman penutup popup).
- `src/lib/drive-export.functions.ts` diubah: menerima `storeId`, mengambil kunci store lalu memanggil `callAsAppUser`; jatuh kembali ke sambungan pusat bila store belum punya kunci. `ExportExcelButton` mengirim store aktif.
- Tidak ada perubahan pada ekspor Excel lokal (tombol "Excel" biasa).

## Langkah yang perlu Anda lakukan

Saat pembangunan dimulai, akan muncul kartu persetujuan untuk menyiapkan OAuth client Google (sekali saja untuk semua store). Setelah itu setiap store cukup menekan "Hubungkan Google Drive" di Setup → Store.
