# AGENTS.md — Pengumpulan Ujian Praktik ICT

## Aturan kerja (WAJIB di setiap sesi)

### Rahasia
- Jangan pernah menempel, mencetak, atau me-log: password, `SUPABASE_SERVICE_ROLE_KEY`, Google OAuth client secret/refresh token, access token.
- Rahasia hanya di `.env` (sudah di `.gitignore`). Sediakan `.env.example` tanpa nilai asli.
- `SUPABASE_SERVICE_ROLE_KEY` hanya dipakai di server (`src/lib/lms.ts`). Jangan pernah di kode frontend atau hasil build.
- Jangan minta pengguna mengetik rahasia di chat.

### Operasi berisiko
- Aplikasi **tidak menulis skema/data ke Supabase LMS**. Jangan menjalankan `supabase db push`, `db reset`, atau membuat tabel/fungsi baru tanpa izin pemilik.
- Semua data ujian (berkas, nilai, soal) ada di Google Drive. Jangan menghapus atau memindahkan folder Drive tanpa konfirmasi.
- Jangan menjalankan perintah destruktif tanpa konfirmasi.

### Praktik kode
- Role selalu dibaca dari tabel LMS `profiles`, bukan `user_metadata`.
- Login/logout lewat route handler POST (`/api/masuk`, `/api/keluar`), **bukan** server action — server action gagal di Cloudflare Pages.
- Semua page/route: `export const runtime = "edge"`.
- Validasi ukuran/tipe berkas di server (`/api/unggah`), bukan hanya di UI.
- Berkas Drive tidak boleh diekspos lewat tautan langsung; sajikan lewat `/api/berkas/<id>` yang memeriksa hak akses.
- Akses guru mengikuti `guru_mengajar` + progul (`src/lib/lms.ts`).

### Stack
- Next.js 15 App Router + TypeScript + Tailwind CSS, mobile-first, UI Bahasa Indonesia
- Supabase LMS (Postgres + Auth) — **read-only**
- Google Drive API + Google Sheets (server only)
- Cloudflare Pages (`@cloudflare/next-on-pages`), runtime edge

## File penting
- `supabase/migrations/0001_ujian_praktik.sql` — sengaja kosong; tidak ada perubahan skema
- `src/lib/env.ts` — variabel lingkungan
- `src/lib/lms.ts` — baca akun/sekolah/penugasan dari LMS
- `src/lib/drive.ts` — Drive + Sheets via fetch/OAuth
- `src/lib/ujian.ts` — folder, pengumpulan, rekap, nilai
- `src/lib/soal.ts` — 6 slot soal di `_soal.json`
- `src/lib/supabase/server.ts` — klien sesi (cookie)
- `src/app/api/masuk/route.ts` — login
- `src/app/api/unggah/route.ts` — unggah berkas
- `src/app/api/nilai/route.ts` — simpan nilai
- `src/app/api/soal/route.ts` — simpan soal
- `src/app/api/berkas/[id]/route.ts` — sajikan berkas dengan cek hak
- `src/app/(app)/page.tsx` — beranda siswa/guru
- `src/app/(app)/nilai/page.tsx` — rekap & penilaian
- `src/app/(app)/soal/page.tsx` — pengaturan soal

## Perintah
- `npm run dev` — jalankan dev server
- `npm run build` — build produksi
- `npm run lint` — lint
- Deploy: lihat `README.md` bagian "Build & deploy" (manual dari salinan di `%LOCALAPPDATA%\Temp\uprak-build`)
