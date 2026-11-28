import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { ambilAkun, bolehSiswa, penugasanGuru, siswaSekolah } from "@/lib/lms"
import { daftarBerkas, infoBerkas, unduhBerkas, type BerkasDrive } from "@/lib/drive"
import { namaSekolah, folderSekolah } from "@/lib/ujian"
import { bacaSoal, targetProgul, tingkatKelas } from "@/lib/soal"

export const runtime = "edge"
export const dynamic = "force-dynamic"

// Hanya tipe ini yang boleh tampil inline. HTML/SVG unggahan siswa dipaksa unduh
// supaya skripnya tidak berjalan di origin aplikasi saat guru klik "Lihat".
const INLINE_AMAN = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
  "text/plain",
])

async function sajikan(meta: BerkasDrive, request: Request) {
  const upstream = await unduhBerkas(meta.id)
  const nama = meta.name.replace(/["\r\n]/g, "")
  const mime = (meta.mimeType || "application/octet-stream").split(";")[0].trim().toLowerCase()
  const mauInline = new URL(request.url).searchParams.get("mode") !== "unduh"
  const inline = mauInline && INLINE_AMAN.has(mime)

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": mime,
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${nama}"`,
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "private, no-store",
    },
  })
}

/**
 * Menyajikan berkas ujian lewat aplikasi (bukan tautan Google Drive).
 * - soal  : sesuai jenjang + progul (guru: slot yang diampu)
 * - siswa : hanya berkas miliknya
 * - guru  : hanya berkas dari kelas + progul yang diampu
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new NextResponse("Silakan masuk", { status: 401 })

  const akun = await ambilAkun(user.id)
  if (!akun) return new NextResponse("Profil tidak ditemukan", { status: 403 })

  const meta = await infoBerkas(id)
  if (!meta) return new NextResponse("Berkas tidak ditemukan", { status: 404 })

  // Berkas soal & lampirannya tinggal di folder _soal, bukan folder sekolah.
  if (/^[789]-(ICT|NONICT) - /.test(meta.name)) {
    const peta = await bacaSoal()
    const kunci = Object.keys(peta).find(
      (k) => peta[k].fileId === id || peta[k].lampiran?.id === id
    )
    if (kunci) {
      const [tingkat, target] = kunci.split("-")
      let boleh = akun.role === "admin"
      if (!boleh && akun.role === "siswa") {
        boleh = tingkatKelas(akun.kelas) === tingkat && targetProgul(akun.progul) === target
      }
      if (!boleh && akun.role === "guru") {
        const daftar = await penugasanGuru(akun.id)
        boleh = daftar.some(
          (p) => tingkatKelas(p.kelas) === tingkat && p.target === target
        )
      }
      if (!boleh) return new NextResponse("Tidak berhak", { status: 403 })
      return sajikan(meta, request)
    }
  }

  const sekolah = await namaSekolah(akun.sekolah_id)
  const folder = await folderSekolah(sekolah)
  const isiFolder = await daftarBerkas(folder)
  const milikSekolah = isiFolder.some((b) => b.id === id)
  if (!milikSekolah) return new NextResponse("Tidak berhak", { status: 403 })

  const nisBerkas = meta.name.split(" ")[0]

  if (akun.role !== "guru") {
    // siswa hanya boleh membuka berkas miliknya
    const nis = akun.nis ?? ""
    if (!nis || nisBerkas !== nis) {
      return new NextResponse("Tidak berhak", { status: 403 })
    }
  } else {
    // guru hanya boleh membuka berkas siswa di kelas + progul yang ditugaskan
    const siswa = await siswaSekolah(akun.sekolah_id ?? "")
    const murid = siswa.find((x) => (x.nis ?? "") === nisBerkas)
    if (!murid || !(await bolehSiswa(akun.id, murid))) {
      return new NextResponse("Tidak berhak", { status: 403 })
    }
  }

  return sajikan(meta, request)
}
