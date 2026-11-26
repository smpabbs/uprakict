# Pengumpulan Ujian Praktik ICT

## Stack
- Next.js 15 (App Router) + TypeScript + Tailwind CSS
- Supabase: Postgres + Auth + RLS + Service Role (server only)
- Google Drive: penyimpanan berkas ujian (service account)
- Bahasa Indonesia, mobile-first

## Autentikasi
- Login NIS (siswa) / username (guru) + password
- Email dipetakan lewat RPC `get_email_by_nis` / `get_email_by_username`
- Role dari tabel `profiles` (bukan user_metadata)
- Signup publik dinonaktifkan

## Berkas ujian
- Disimpan di Google Drive (folder per sekolah/tahun/siswa)
- Metadata + nilai disimpan di Supabase `ujian_praktik_pengumpulan`

## Variabel lingkungan (.env)
Salin `.env.example` menjadi `.env` dan isi:
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- NEXT_PUBLIC_SEKOLAH_ID
- NEXT_PUBLIC_SEKOLAH_NAMA
- GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON
- GOOGLE_DRIVE_ROOT_FOLDER_ID

## Setup
1. `npm install`
2. Isi `.env`
3. `npx supabase db push` (migrasi ke Supabase)
4. `npx supabase config push` (auth config)
5. Seed akun via script (lihat scripts/)
6. `npm run dev`

## Keamanan
- Semua tabel RLS aktif; `anon` dicabut
- `service_role` hanya di server, tidak di frontend/build
- Role dari `profiles`, bukan `user_metadata`
