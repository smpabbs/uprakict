-- ============================================================
-- Pengumpulan Ujian Praktik ICT — Fase 1
-- Tabel: ujian_praktik_tahun, ujian_praktik_pengumpulan
-- RPC: get_email_by_nis, get_email_by_username
-- RLS, is_guru(), hak akses
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- RPC untuk login (NIS/username -> email Supabase Auth) ----------
create or replace function public.get_email_by_nis(p_nis text, p_sekolah_id uuid)
returns text
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_email text;
begin
  select au.email into v_email
  from public.profiles p
  join auth.users au on au.id = p.id
  where p.nis = p_nis
    and p.sekolah_id = p_sekolah_id
    and p.role in ('siswa', 'guru')
  limit 1;
  return v_email;
end;
$$;

create or replace function public.get_email_by_username(p_username text)
returns text
language plpgsql
security definer
stable
set search_path = public
as $$
declare
  v_email text;
begin
  select au.email into v_email
  from public.profiles p
  join auth.users au on au.id = p.id
  where p.nis = p_username
    and p.role = 'guru'
  limit 1;
  return v_email;
end;
$$;

revoke all on function public.get_email_by_nis(text, uuid) from public;
revoke all on function public.get_email_by_username(text) from public;
grant execute on function public.get_email_by_nis(text, uuid) to anon, authenticated;
grant execute on function public.get_email_by_username(text) to anon, authenticated;

-- ---------- Tabel ujian_praktik_tahun ----------
create table if not exists public.ujian_praktik_tahun (
  id uuid primary key default gen_random_uuid(),
  sekolah_id uuid not null,
  tahun_ajaran text not null check (char_length(tahun_ajaran) between 1 and 20),
  semester int not null check (semester in (1, 2)),
  nama text not null check (char_length(nama) between 1 and 200),
  deskripsi text,
  buka_pada timestamptz,
  tutup_pada timestamptz,
  dibuat_oleh uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  unique (sekolah_id, tahun_ajaran, semester)
);

-- ---------- Tabel ujian_praktik_pengumpulan ----------
create table if not exists public.ujian_praktik_pengumpulan (
  id uuid primary key default gen_random_uuid(),
  tahun_id uuid not null references public.ujian_praktik_tahun(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  file_name text not null check (char_length(file_name) between 1 and 255),
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
  constraint file_size_wajar check (file_size <= 50 * 1024 * 1024)
);

create index ujian_pengumpulan_tahun_idx on public.ujian_praktik_pengumpulan (tahun_id);
create index ujian_pengumpulan_siswa_idx on public.ujian_praktik_pengumpulan (student_id);

-- ---------- Fungsi bantu ----------
create or replace function public.is_guru()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'guru'
  );
$$;

create or replace function public.sekolah_saya()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select sekolah_id from public.profiles where id = (select auth.uid()) limit 1;
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------- RLS ----------
alter table public.ujian_praktik_tahun enable row level security;
alter table public.ujian_praktik_pengumpulan enable row level security;

revoke all on public.ujian_praktik_tahun, public.ujian_praktik_pengumpulan from anon, authenticated;
grant select on public.ujian_praktik_tahun to authenticated;
grant select, insert on public.ujian_praktik_pengumpulan to authenticated;
grant select on public.ujian_praktik_pengumpulan to authenticated;

grant execute on function public.is_guru(), public.sekolah_saya() to authenticated;

-- tahun: baca milik sekolahnya; guru insert milik sekolahnya
create policy tahun_select on public.ujian_praktik_tahun
  for select to authenticated
  using (sekolah_id = (select public.sekolah_saya()));

create policy tahun_insert_guru on public.ujian_praktik_tahun
  for insert to authenticated
  with check ((select public.is_guru()) and sekolah_id = (select public.sekolah_saya()));

-- pengumpulan: siswa baca/masukkan miliknya; guru baca semua sekolahnya, update nilai
create policy pengumpulan_select on public.ujian_praktik_pengumpulan
  for select to authenticated
  using (
    student_id = (select auth.uid())
    or (
      (select public.is_guru())
      and exists (
        select 1 from public.ujian_praktik_tahun t
        where t.id = tahun_id and t.sekolah_id = (select public.sekolah_saya())
      )
    )
  );

create policy pengumpulan_insert_siswa on public.ujian_praktik_pengumpulan
  for insert to authenticated
  with check (
    student_id = (select auth.uid())
    and exists (
      select 1 from public.ujian_praktik_tahun t
      where t.id = tahun_id
        and t.sekolah_id = (select public.sekolah_saya())
        and (t.tutup_pada is null or t.tutup_pada > now())
    )
  );

create policy pengumpulan_update_guru on public.ujian_praktik_pengumpulan
  for update to authenticated
  using ((select public.is_guru()))
  with check ((select public.is_guru()));

-- Trigger updated_at pada pengumpulan
drop trigger if exists ujian_pengumpulan_touch on public.ujian_praktik_pengumpulan;
create trigger ujian_pengumpulan_touch
  before update on public.ujian_praktik_pengumpulan
  for each row execute function public.touch_updated_at();
