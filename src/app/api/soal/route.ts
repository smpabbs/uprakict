import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { ambilAkun } from "@/lib/lms"
import { simpanSoal, semuaSlot } from "@/lib/soal"

export const runtime = "edge"
export const dynamic = "force-dynamic"

const ROLE_BOLEH = new Set(["admin", "guru"])

/** Simpan soal/instruksi satu slot (admin/guru). */
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const asal = new URL("/soal", request.url)
  if (!user) return NextResponse.redirect(new URL("/login", request.url), 303)

  const akun = await ambilAkun(user.id)
  if (!akun || !ROLE_BOLEH.has(akun.role)) {
    asal.searchParams.set("e", "Hanya admin atau guru yang boleh mengubah soal.")
    return NextResponse.redirect(asal, 303)
  }

  const form = await request.formData()
  const kunci = String(form.get("kunci") ?? "")
  const judul = String(form.get("judul") ?? "").trim()
  const isi = String(form.get("isi") ?? "")

  if (!semuaSlot().some((s) => s.kunci === kunci)) {
    asal.searchParams.set("e", "Slot soal tidak dikenal.")
    return NextResponse.redirect(asal, 303)
  }
  if (!judul && !isi.trim()) {
    asal.searchParams.set("e", "Judul dan isi soal tidak boleh kosong.")
    return NextResponse.redirect(asal, 303)
  }

  try {
    await simpanSoal(kunci, { judul, isi, oleh: akun.nama })
    asal.searchParams.set("k", kunci)
    asal.searchParams.set("ok", "1")
  } catch (e) {
    asal.searchParams.set("e", (e as Error).message)
  }
  return NextResponse.redirect(asal, 303)
}
