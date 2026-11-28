// Pusat pembacaan variabel lingkungan. Hanya NEXT_PUBLIC_* yang boleh ke browser.
export const LMS_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
export const LMS_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
export const LMS_SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const SEKOLAH_DEFAULT = process.env.NEXT_PUBLIC_SEKOLAH_ID ?? ""
export const SEKOLAH_NAMA = process.env.NEXT_PUBLIC_SEKOLAH_NAMA ?? "SMP ABBS Surakarta"

export const G_CLIENT_ID = process.env.GOOGLE_CLIENT_ID ?? ""
export const G_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET ?? ""
export const G_REFRESH_TOKEN = process.env.GOOGLE_REFRESH_TOKEN ?? ""
export const DRIVE_ROOT = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID ?? ""

export const UJIAN = {
  tahunAjaran: process.env.UJIAN_TAHUN_AJARAN ?? "2026/2027",
  semester: Number(process.env.UJIAN_SEMESTER ?? "1"),
  nama: process.env.UJIAN_NAMA ?? "Ujian Praktik ICT",
  deskripsi: process.env.UJIAN_DESKRIPSI ?? "",
  tutup: process.env.UJIAN_TUTUP ?? "",
  // jam mundur untuk penandaan terlambat saat UJIAN_TUTUP kosong
  mundur: Number(process.env.UJIAN_MUNDUR_JAM ?? "2"),
}

export const MAKS_MB = Number(process.env.UJIAN_MAKS_MB ?? '50')
export const MAKS_BYTE = MAKS_MB * 1024 * 1024
