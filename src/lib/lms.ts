// Baca-saja dari Supabase LMS: daftar sekolah + pencarian akun untuk login.
// TIDAK menulis apa pun ke database LMS.
import { createClient } from "@supabase/supabase-js"
import { LMS_URL, LMS_SERVICE } from "./env"

export interface Akun {
  id: string
  nis: string | null
  username: string | null
  nama: string
  role: string
  kelas: string | null
  sekolah_id: string | null
  email: string
}

export interface Sekolah {
  id: string
  nama: string
}

function admin() {
  if (!LMS_SERVICE) throw new Error("SUPABASE_SERVICE_ROLE_KEY belum diisi")
  return createClient(LMS_URL, LMS_SERVICE, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function daftarSekolah(): Promise<Sekolah[]> {
  const { data, error } = await admin()
    .from("sekolah")
    .select("id,nama")
    .eq("is_active", true)
    .order("nama")
  if (error) throw new Error("Gagal membaca daftar sekolah: " + error.message)
  return (data ?? []) as Sekolah[]
}

/** Login siswa: NIS + sekolah. */
export async function cariSiswa(nis: string, sekolahId: string): Promise<Akun | null> {
  const { data, error } = await admin()
    .from("profiles")
    .select("id,nis,username,nama,role,kelas,sekolah_id,email")
    .eq("nis", nis)
    .eq("sekolah_id", sekolahId)
    .eq("role", "siswa")
    .limit(1)
    .maybeSingle()
  if (error) throw new Error("Gagal memeriksa NIS: " + error.message)
  return (data as Akun) ?? null
}

/** Login guru: username (fallback NIS/NIP kalau kolomnya terisi). */
export async function cariGuru(identifier: string): Promise<Akun | null> {
  const { data, error } = await admin()
    .from("profiles")
    .select("id,nis,username,nama,role,kelas,sekolah_id,email")
    .eq("role", "guru")
    .or(`username.ilike.${identifier},nis.eq.${identifier}`)
    .limit(1)
  if (error) throw new Error("Gagal memeriksa username: " + error.message)
  const akun = ((data ?? [])[0] ?? null) as Akun | null
  return akun
}

export async function ambilAkun(id: string): Promise<Akun | null> {
  const { data } = await admin()
    .from("profiles")
    .select("id,nis,username,nama,role,kelas,sekolah_id,email")
    .eq("id", id)
    .maybeSingle()
  return (data as Akun) ?? null
}

/** Semua siswa satu sekolah (untuk rekap guru). */
export async function siswaSekolah(sekolahId: string): Promise<Akun[]> {
  const { data, error } = await admin()
    .from("profiles")
    .select("id,nis,username,nama,role,kelas,sekolah_id,email")
    .eq("sekolah_id", sekolahId)
    .eq("role", "siswa")
    .not("nis", "is", null)
    .order("kelas")
    .order("nama")
  if (error) throw new Error("Gagal membaca daftar siswa: " + error.message)
  return (data ?? []) as Akun[]
}
