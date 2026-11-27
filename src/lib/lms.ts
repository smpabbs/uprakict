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
  progul?: string | null
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
    .select("id,nis,username,nama,role,kelas,progul,sekolah_id,email")
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
    .select("id,nis,username,nama,role,kelas,progul,sekolah_id,email")
    .eq("role", "guru")
    .or(`username.ilike.${identifier},nis.eq.${identifier}`)
    .limit(1)
  if (error) throw new Error("Gagal memeriksa username: " + error.message)
  const akun = ((data ?? [])[0] ?? null) as Akun | null
  return akun
}

/** Login staf (guru/admin/auditor) memakai username atau NIS. */
export async function cariStaff(identifier: string): Promise<Akun | null> {
  const { data, error } = await admin()
    .from("profiles")
    .select("id,nis,username,nama,role,kelas,progul,sekolah_id,email")
    .in("role", ["guru", "admin", "admin_keuangan", "auditor"])
    .or(`username.ilike.${identifier},nis.eq.${identifier}`)
    .limit(1)
  if (error) throw new Error("Gagal memeriksa akun staf: " + error.message)
  return ((data ?? [])[0] ?? null) as Akun | null
}

export async function ambilAkun(id: string): Promise<Akun | null> {
  const { data } = await admin()
    .from("profiles")
    .select("id,nis,username,nama,role,kelas,progul,sekolah_id,email")
    .eq("id", id)
    .maybeSingle()
  return (data as Akun) ?? null
}

/** Semua siswa satu sekolah (untuk rekap guru). */
export async function siswaSekolah(sekolahId: string): Promise<Akun[]> {
  const { data, error } = await admin()
    .from("profiles")
    .select("id,nis,username,nama,role,kelas,progul,sekolah_id,email")
    .eq("sekolah_id", sekolahId)
    .eq("role", "siswa")
    .not("nis", "is", null)
    .order("kelas")
    .order("nama")
  if (error) throw new Error("Gagal membaca daftar siswa: " + error.message)
  return (data ?? []) as Akun[]
}

/* ---------------- penugasan mengajar (kelas + progul) ---------------- */

export type TargetProgul = "ICT" | "NONICT"

export interface Penugasan {
  kelas: string // "7C"
  mapel: string // "ICT Progul" / "ICT Non Progul"
  target: TargetProgul
  label: string // "7C · ICT"
}

const RE_KELAS = /^(\d{1,2})\s*[- ]?\s*([A-H])\b/i

/** "7C" / "7 c" / "8A IBN FIRNAS" → "8A"; selain pola itu → null. */
export function normalKelas(nilai: string | null | undefined): string | null {
  const t = String(nilai ?? "").trim()
  const m = t.match(RE_KELAS)
  if (m) return (m[1] + m[2]).toUpperCase()
  const rapat = t.toUpperCase().replace(/\s+/g, "")
  return /^\d{1,2}[A-H]$/.test(rapat) ? rapat : null
}

/**
 * Penugasan mengajar ICT seorang guru menurut LMS (`guru_mengajar`).
 * Progul menentukan subset siswa:
 *  - "ICT Progul"     → siswa dengan progul = ICT
 *  - "ICT Non Progul" → siswa dengan progul selain ICT (TCP/VCP)
 */
export async function penugasanGuru(guruId: string): Promise<Penugasan[]> {
  const db = admin()
  const [{ data: mapel }, { data: ajar }] = await Promise.all([
    db.from("mata_pelajaran").select("id,nama"),
    db.from("guru_mengajar").select("kelas,mapel_id").eq("guru_id", guruId),
  ])
  const ict = new Map<string, string>()
  for (const m of (mapel ?? []) as { id: string; nama: string }[]) {
    if (/ICT/i.test(m.nama ?? "")) ict.set(m.id, m.nama)
  }
  const hasil = new Map<string, Penugasan>()
  for (const row of (ajar ?? []) as { kelas: string | null; mapel_id: string }[]) {
    const nama = ict.get(row.mapel_id)
    if (!nama) continue
    const kelas = normalKelas(row.kelas)
    if (!kelas) continue
    const target: TargetProgul = /non/i.test(nama) ? "NONICT" : "ICT"
    hasil.set(kelas + target, {
      kelas,
      mapel: nama,
      target,
      label: `${kelas} · ${target === "ICT" ? "ICT" : "Non-ICT"}`,
    })
  }
  return Array.from(hasil.values()).sort(
    (a, b) => a.kelas.localeCompare(b.kelas) || a.target.localeCompare(b.target)
  )
}

/** Apakah siswa termasuk dalam penugasan guru (kelas sama + progul sesuai). */
export function siswaCocok(
  siswa: { kelas: string | null; progul?: string | null },
  p: Penugasan
): boolean {
  if ((siswa.kelas ?? "").toUpperCase() !== p.kelas) return false
  const progul = (siswa.progul ?? "").toUpperCase()
  return p.target === "ICT" ? progul === "ICT" : progul !== "ICT"
}

/** Cek hak guru atas satu siswa (dipakai API berkas & nilai). */
export async function bolehSiswa(
  guruId: string,
  siswa: { kelas: string | null; progul?: string | null }
): Promise<boolean> {
  const daftar = await penugasanGuru(guruId)
  return daftar.some((p) => siswaCocok(siswa, p))
}
