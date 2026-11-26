import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { ambilAkun, bolehKelas } from "@/lib/lms"
import { namaSekolah, simpanNilaiSiswa } from "@/lib/ujian"

export const runtime = "edge"
export const dynamic = "force-dynamic"

/** Simpan nilai/feedback guru (POST form biasa) lalu kembali ke daftar kelas. */
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const asal = new URL("/nilai", request.url)
  if (!user) return NextResponse.redirect(new URL("/login", request.url), 303)

  const guru = await ambilAkun(user.id)
  if (!guru || guru.role !== "guru") return NextResponse.redirect(asal, 303)

  const form = await request.formData()
  const nis = String(form.get("nis") ?? "").trim()
  const nama = String(form.get("nama") ?? "").trim()
  const kelas = String(form.get("kelas") ?? "").trim()
  const nilaiMentah = String(form.get("nilai") ?? "").trim()
  const feedback = String(form.get("feedback") ?? "").trim()
  const kembali = String(form.get("kembali") ?? "")

  if (kembali) asal.searchParams.set("kelas", kembali)
  if (!nis) {
    asal.searchParams.set("e", "NIS kosong")
    return NextResponse.redirect(asal, 303)
  }
  if (nilaiMentah !== "") {
    const n = Number(nilaiMentah)
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      asal.searchParams.set("e", "Nilai harus 0–100")
      return NextResponse.redirect(asal, 303)
    }
  }

  try {
    if (!(await bolehKelas(guru.id, kelas))) {
      asal.searchParams.set("e", `Anda tidak ditugaskan mengajar ICT di kelas ${kelas || "-"}.`)
      return NextResponse.redirect(asal, 303)
    }
    const sekolah = await namaSekolah(guru.sekolah_id)
    await simpanNilaiSiswa({
      namaSekolahStr: sekolah,
      nis,
      nama,
      kelas,
      nilai: nilaiMentah,
      feedback,
      oleh: guru.nama,
    })
    asal.searchParams.set("ok", nis)
  } catch (e) {
    asal.searchParams.set("e", (e as Error).message)
  }
  return NextResponse.redirect(asal, 303)
}
