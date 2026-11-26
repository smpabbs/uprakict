export type Role = 'guru' | 'siswa'

export interface Profile {
  id: string
  nis: string
  nama: string
  role: Role
  created_at: string
}

export interface UjianTahun {
  id: string
  sekolah_id: string
  tahun_ajaran: string
  semester: number
  nama: string
  deskripsi: string | null
  buka_pada: string | null
  tutup_pada: string | null
  dibuat_oleh: string | null
  created_at: string
}

export interface Pengumpulan {
  id: string
  tahun_id: string
  student_id: string
  file_name: string
  file_size: number
  file_mime: string
  google_drive_file_id: string
  google_drive_web_view_link: string | null
  catatan: string | null
  nilai: number | null
  feedback: string | null
  nilai_oleh: string | null
  nilai_pada: string | null
  submitted_at: string
  updated_at: string
}

export interface SiswaRingkasan {
  id: string
  nis: string
  nama: string
  pengumpulan: Pengumpulan | null
}
