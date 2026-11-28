# PLAN.md — Pengumpulan Ujian Praktik ICT (Semua Unit Sekolah)

> **STATUS: DOKUMEN HISTORIS (26 Nov 2026).** Arsitektur final ada di `README.md`.
> Rencana tabel Supabase/RLS di bawah **DIBATALKAN** oleh pemilik: aplikasi hanya
> membaca LMS dan menyimpan semua data di Google Drive. Jangan mengikuti bagian
> skema database di dokumen ini.

Referensi: `forum-abbs` (auth LMS via NIS/username + RPC, satu project Supabase, RLS, service key server-side),
`forum ict` (Vite+React+Supabase, email palsu mapping, seed CSV idempoten, RLS `is_guru()`, iframe lab + postMessage,
antrean offline, ekspor CSV), `absenguru` (Flask session auth, lokasi sekolah), `absensi-guru-abbs` (dua project Supabase,
config publik hanya publishable key).

Tujuan: siswa login dengan akun LMS (NIS/password), mengumpulkan berkas ujian praktik ICT; guru login di tempat yang sama
untuk melihat & menilai hasil semua siswa; berlaku untuk semua unit sekolah; berkas ujian disimpan di Google Drive,
metadata & nilai di Supabase.

---

## 1. Keputusan teknis

| Hal | Keputusan | Alasan / rujukan |
|---|---|---|
| Frontend | Next.js (App Router) + TypeScript + Tailwind CSS, mobile-first, UI Bahasa Indonesia | Mirip `forum-abbs` (SSR auth cookie aman, middleware) |
| Backend/Auth | Supabase (Postgres + Auth + RLS + Storage), **satu project bersama LMS** | Pola `forum-abbs`: akun LMS dipakai utk login, tidak dibuat ulang |
| Login siswa | NIS + password, email dipetakan lewat RPC `get_email_by_nis(p_nis, p_sekolah_id)` | `forum-abbs` `0011_forum_satu_project.sql`, `auth-actions.ts` |
| Login guru | Username + password, email lewat RPC `get_email_by_username(p_username)` | Sama di atas, role `guru` |
| Signup publik | Dinonaktifkan (`config.toml` `enable_signup=false`) | `forum ict` `PROMPT.md` §3 |
| Email | Palsu di balik layar, siswa/guru tidak pernah melihatnya | `forum ict` domain `{nis}@siswa.kelas.invalid` |
| Berkas ujian | Google Drive API (folder per sekolah per tahun ajaran) | Permintaan pengguna: penyimpanan di Google Drive |
| Metadata & nilai | Supabase tabel `ujian_praktik_*`, RLS, `is_guru()` | `forum ict` migration, `submissions` |
| Akses multi-sekolah | Kolom `sekolah_id` pada semua tabel data, scope lewak RLS | `forum-abbs` `SEKOLAH_ID`, `forum_rooms.sekolah_id` |
| Service key | Hanya di server (Edge Function / Server Action), tidak di frontend | `forum-abbs` `env.ts`, `supabase/service.ts` |
| Hosting target | Vercel / Cloudflare Pages (static + SSR) | `forum-abbs` sudah siap Android/PWA |

---

## 2. Model data (Supabase, satu project bersama LMS)

```sql
-- Tabel akademik sudah ada di project LMS: profiles (nis, nama, role, sekolah_id), auth.users
-- Migration baru hanya menambah tabel ujian praktik, tidak mengubah tabel LMS.

create table public.ujian_praktik_tahun (
  id uuid primary key default gen_random_uuid(),
  sekolah_id uuid not null,           -- ref ke profiles/LMS sekolah
  tahun_ajaran text not null,         -- mis. "2026/2027"
  semester int not null check (semester in (1,2)),
  nama text not null,                 -- mis. "Ujian Praktik ICT Semester 1"
  deskripsi text,
  buka_pada timestamptz,              -- buka pengumpulan
  tutup_pada timestamptz,             -- deadline
  dibuat_oleh uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (sekolah_id, tahun_ajaran, semester)
);

create table public.ujian_praktik_pengumpulan (
  id uuid primary key default gen_random_uuid(),
  tahun_id uuid not null references public.ujian_praktik_tahun(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  file_name text not null,
  file_size int not null,
  file_mime text not null,
  google_drive_file_id text not null unique,
  google_drive_web_view_link text,
  catatan text,
  nilai int check (nilai is null or (nilai >= 0 and nilai <= 100)),
  feedback text,
  nilai_oleh uuid references public.profiles(id),
  nilai_pada timestamptz,
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tahun_id, student_id),
  constraint file_size_wajar check (file_size <= 50 * 1024 * 1024)  -- 50 MB
);

create index ujian_pengumpulan_tahun_idx on public.ujian_praktik_pengumpulan (tahun_id);
create index ujian_pengumpulan_siswa_idx on public.ujian_praktik_pengumpulan (student_id);

-- Fungsi bantu
create or replace function public.is_guru()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'guru');
$$;

create or replace function public.sekolah_saya()
returns uuid language sql stable security definer set search_path = public as $$
  select sekolah_id from public.profiles where id = (select auth.uid()) limit 1;
$$;

-- Trigger updated_at
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

-- RLS: semua tabel diaktifkan, tanpa policy => anon/authenticated tidak bisa langsung akses
alter table public.ujian_praktik_tahun enable row level security;
alter table public.ujian_praktik_pengumpulan enable row level security;
revoke all on public.ujian_praktik_tahun, public.ujian_praktik_pengumpulan from anon, authenticated;
grant select on public.ujian_praktik_tahun to authenticated;
grant select, insert on public.ujian_praktik_pengumpulan to authenticated;
grant select on public.ujian_praktik_pengumpulan to authenticated;
grant execute on function public.is_guru(), public.sekolah_saya() to authenticated;

-- Policies
-- tahun: siswa/guru baca tahun milik sekolahnya; guru CRUD penuh milik sekolahnya
create policy tahun_select on public.ujian_praktik_tahun
  for select to authenticated
  using (sekolah_id = (select public.sekolah_saya()));

create policy tahun_insert_guru on public.ujian_praktik_tahun
  for insert to authenticated
  with check ((select public.is_guru()) and sekolah_id = (select public.sekolah_saya()));

-- pengumpulan: siswa baca/mengubah miliknya; guru baca semua milik sekolahnya, update nilai/feedback
create policy pengumpulan_select on public.ujian_praktik_pengumpulan
  for select to authenticated
  using (
    student_id = (select auth.uid())
    or (select public.is_guru())
    and exists (
      select 1 from public.ujian_praktik_tahun t
      where t.id = tahun_id and t.sekolah_id = (select public.sekolah_saya())
    )
  );

create policy pengumpulan_insert_siswa on public.ujian_praktik_pengumpulan
  for insert to authenticated
  with check (
    student_id = (select auth.uid())
    and exists (
      select 1 from public.ujian_praktik_tahun t
      where t.id = tahun_id and t.sekolah_id = (select public.sekolah_saya())
      and t.tutup_pada > now()
    )
  );

create policy pengumpulan_update_guru on public.ujian_praktik_pengumpulan
  for update to authenticated
  using ((select public.is_guru()))
  with check ((select public.is_guru()));
```

---

## 3. Arsitektur autentikasi (pola `forum-abbs`)

1. Halaman login menerima **NIS** (siswa) atau **username** (guru) + password.
2. Server Action memanggil RPC Supabase `get_email_by_nis` / `get_email_by_username` (key anon, dieksekusi server) untuk mendapatkan email Supabase Auth yang terkait.
3. `signInWithPassword` dengan email tersebut + password.
4. Cookie sesi ditulis melalui adapter SSR (Next.js).
5. Role dibaca dari tabel `profiles` (bukan `user_metadata`), sesuai aturan keamanan `forum ict`.

Tidak ada pendaftaran publik. Akun dibuat oleh admin LMS / script seeding dari CSV (NIS, nama, role, sekolah_id, password).

---

## 4. Integrasi Google Drive (berkas ujian)

- Berkas ujian praktik (file tugas/ujian siswa) diunggah ke **Google Drive**, bukan Supabase Storage.
- Server Action (atau Edge Function) menggunakan **Google Drive API** dengan Service Account atau OAuth credentials yang disimpan aman di environment server.
- Folder struktur Drive: `Ujian Praktik ICT / {Sekolah} / {Tahun Ajaran} / Semester {X} / {NIS} / file-ujian`.
- Tabel `ujian_praktik_pengumpulan` menyimpan `google_drive_file_id` dan `google_drive_web_view_link` untuk unduhan/preview oleh guru.
- Quota: batasi ukuran file (mis. 50 MB) lewat CHECK constraint dan validasi server.

---

## 5. Struktur folder target

```
X:\pengumpulan ujian praktik ICT\
├─ PLAN.md, README.md, AGENTS.md
├─ .env.example, .gitignore, next.config.mjs, tailwind.config.ts, tsconfig.json
├─ supabase/
│  ├─ config.toml
│  └─ migrations/
│     └─ 0001_ujian_praktik.sql
├─ scripts/
│  ├─ seed-sekolah.mjs        -- daftar sekolah + tahun ajaran (idempoten)
│  └─ test-rls.mjs            -- 10 kasus keamanan (mirip forum ict)
├─ src/
│  ├─ app/
│  │  ├─ login/page.tsx
│  │  ├─ (app)/               -- setelah login
│  │  │  ├─ layout.tsx
│  │  │  ├─ page.tsx          -- beranda (siswa: daftar ujian; guru: daftar sekolah/tahun)
│  │  │  ├─ ujian/[tahunId]/page.tsx   -- siswa: pengumpulan file
│  │  │  ├─ guru/hasil/[tahunId]/page.tsx  -- guru: tabel semua siswa + nilai
│  │  │  └─ guru/nilai/[pengumpulanId]/page.tsx  -- guru: input nilai & feedback
│  │  ├─ middleware.ts        -- guard auth + sekolah scope
│  │  └─ globals.css
│  ├─ lib/
│  │  ├─ supabase/auth.ts     -- klien sesi (browser)
│  │  ├─ supabase/service.ts  -- klien service role (server saja)
│  │  ├─ supabase/server.ts   -- klien Server Action (cookie)
│  │  ├─ auth-actions.ts      -- login NIS/username via RPC
│  │  ├─ env.ts               -- variabel lingkungan
│  │  ├─ drive.ts             -- Google Drive API wrapper (server)
│  │  ├─ guards.ts            -- role/sekolah guard
│  │  └─ types.ts
│  ├─ components/
│  │  ├─ LoginForm.tsx
│  │  ├─ UploadUjian.tsx      -- input file + kirim ke Drive via server action
│  │  ├─ TabelHasil.tsx       -- guru: siswa x status + nilai
│  │  ├─ NavDrawer.tsx, NavMenuButton.tsx  -- mobile nav (forum-abbs)
│  │  └─ ...
│  └─ actions/
│     ├─ login.ts
│     ├─ upload-ujian.ts      -- server: unggah Drive + simpan metadata
│     └─ input-nilai.ts       -- server: guru isi nilai/feedback
├─ public/
│  ├─ manifest.webmanifest
│  └─ icons/
├─ package.json
└─ vercel.json
```

---

## 6. Halaman & alur pengguna

### Siswa
1. Login (NIS + password) → beranda menampilkan ujian praktik aktif milik sekolahnya (tahun ajaran + semester yang buka).
2. Klik ujian → halaman pengumpulan: instruksi, batas ukuran, tombol pilih file, unggah.
3. Setelah unggah berhasil → status "Terkumpul", tampilkan waktu & link file (bisa unduh ulang sebelum deadline).
4. Sebelum tutup_pada: boleh mengunggah ulang (timpa file lama).
5. Keluar / Ganti password.

### Guru
1. Login (username + password) → beranda menampilkan daftar sekolah yang diampu + tahun ajaran ujian aktif.
2. Pilih tahun → tabel semua siswa: NIS, nama, kelas, status (Belum/Terkumpul), nilai (kosong = belum dinilai).
3. Klik satu siswa → lihat detail file (preview/unduh dari Google Drive), input nilai (0-100) + feedback, simpan.
4. Ekspor CSV rekap nilai per sekolah/tahun (pemisah titik koma, BOM UTF-8, pola `forum ict`).

---

## 7. Keamanan (WAJIB)

- Semua tabel data wajib `ENABLE ROW LEVEL SECURITY`; `anon` dicabut dari semua tabel/fungsi.
- `service_role` key **hanya** di environment server (`.env`, Vercel env), tidak ada di frontend/build.
- Role otorisasi dari tabel `profiles`, bukan `user_metadata`.
- Siswa hanya bisa melihat/mengubah pengumpulan miliknya sendiri; guru hanya data sekolahnya.
- Google Drive credentials hanya di server, tidak bocor ke klien.
- Tidak mencetak/log password, service key, atau token Drive.
- `data/` (jika ada CSV seeding dengan password) masuk `.gitignore`; setelah seeding, simpan aman atau hapus.

---

## 8. Variabel lingkungan (`.env.example`)

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

NEXT_PUBLIC_SEKOLAH_ID=            -- default sekolah saat setup awal (opsional)
NEXT_PUBLIC_SEKOLAH_NAMA=

GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON= -- JSON service account (server only)
GOOGLE_DRIVE_ROOT_FOLDER_ID=       -- folder root "Ujian Praktik ICT" di Drive
```

---

## 9. Fase dan kriteria selesai

### Fase 1 (MVP)
- [ ] Migration `0001_ujian_praktik.sql` (tahun, pengumpulan, RLS, `is_guru()`, `sekolah_saya()`)
- [ ] Auth login NIS/username via RPC + supabase config (signup off)
- [ ] Server Action unggah file ke Google Drive + simpan metadata
- [ ] Halaman siswa: beranda ujian aktif, pengumpulan file, status
- [ ] Halaman guru: daftar sekolah/tahun, tabel hasil siswa, input nilai & feedback
- [ ] Ekspor CSV rekap nilai
- [ ] Tes RLS minimal 10 kasus (mirip `forum ict` §8)
- [ ] Build bersih, tidak ada rahasia di bundle

### Fase 2 (nanti)
- Notifikasi email/whatsapp saat guru memberi nilai
- Riwayat pengumpulan (beberapa versi file)
- Ujian dengan waktu terbatas (timer server-side)
- Integrasi lengkap dengan data kelas & wali kelas dari LMS

---

## 10. Langkah berikutnya

1. Buat repo git di `X:\pengumpulan ujian praktik ICT`, inisialisasi Next.js + TypeScript + Tailwind.
2. Siapkan `.env.example` dan minta pengguna mengisi `.env` sendiri (Supabase URL/anon key + service role, Google Drive credentials).
3. Buat Supabase migration dan jalankan `supabase db push` (setelah konfirmasi project ref).
4. Implementasi login, upload Drive, halaman siswa/guru sesuai PLAN di atas.
5. Tulis `scripts/test-rls.mjs` dan verifikasi 10 kasus keamanan.
