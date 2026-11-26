# AGENTS.md — Pengumpulan Ujian Praktik ICT

## Aturan kerja (WAJIB di setiap sesi)

### Rahasia
- Jangan pernah menempel, mencetak, atau me-log: password, `SUPABASE_SERVICE_ROLE_KEY`, Google Drive service account JSON, access token.
- Rahasia hanya di `.env` (sudah di `.gitignore`). Sediakan `.env.example` tanpa nilai asli.
- `SUPABASE_SERVICE_ROLE_KEY` hanya dipakai di `src/lib/supabase/service.ts` dan API routes (server). Jangan pernah di kode frontend atau hasil build.
- Jangan minta pengguna mengetik rahasia di chat.

### Operasi berisiko
- Sebelum `supabase db push`, `db reset`, `config push`, atau seeding: tampilkan project ref dan minta konfirmasi.
- Hanya bekerja pada project ref yang diberikan pengguna. Jangan membuat project baru tanpa bertanya.
- Jangan menjalankan perintah destruktif tanpa konfirmasi.

### Praktik kode
- Semua tabel di schema `public` wajib `ENABLE ROW LEVEL SECURITY`. Tabel tanpa policy = tertutup.
- Cabut hak `anon` ke semua tabel/fungsi. Beri hak ke `authenticated` seperlunya, biarkan RLS yang membatasi.
- Jangan percaya `user_metadata` untuk otorisasi. Role selalu dibaca dari tabel `profiles`.
- Validasi dan batasi ukuran input di database (CHECK constraint), bukan hanya di UI.
- Kode lintas platform (Node.js). Tidak bergantung pada shell khusus OS.

### Stack
- Next.js 15 App Router + TypeScript + Tailwind CSS
- Supabase (Postgres + Auth + RLS), satu project bersama LMS
- Google Drive API (server only) untuk berkas ujian
- UI Bahasa Indonesia, mobile-first

## File penting
- `supabase/migrations/0001_ujian_praktik.sql` — skema + RLS + RPC
- `src/lib/supabase.ts` — klien browser
- `src/lib/supabase/server.ts` — klien server (cookies)
- `src/lib/supabase/service.ts` — klien service role (server only)
- `src/lib/auth-actions.ts` — login NIS/username via RPC
- `src/app/api/upload/route.ts` — unggah ke Google Drive + simpan metadata
- `src/app/api/pengumpulan/[id]/nilai/route.ts` — guru input nilai

## Perintah
- `npm run dev` — jalankan dev server
- `npm run build` — build produksi
- `npm run lint` — lint
- `npx supabase db push` — push migrasi (butuh konfirmasi project ref)
- `npx supabase config push` — push auth config
