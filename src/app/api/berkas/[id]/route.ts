import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { ambilAkun, bolehSiswa, siswaSekolah } from "@/lib/lms"
import { infoBerkas, unduhBerkas } from "@/lib/drive"
import { daftarBerkas } from "@/lib/drive"
import { namaSekolah, folderSekolah } from "@/lib/ujian"

export const runtime = "edge"
export const dynamic = "force-dynamic"

/**
 * Menyajikan berkas ujian lewat aplikasi (bukan tautan Google Drive).
 * - siswa: hanya berkas miliknya
 * - guru : hanya berkas dari sekolahnya
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

  const upstream = await unduhBerkas(id)
  const nama = meta.name.replace(/"/g, "")
  const inline = new URL(request.url).searchParams.get("mode") !== "unduh"

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": meta.mimeType || "application/octet-stream",
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${nama}"`,
      "Cache-Control": "private, no-store",
    },
  })
}
