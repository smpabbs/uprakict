import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { ambilAkun } from "@/lib/lms"
import { simpanKelasGuru } from "@/lib/prefs"

export const runtime = "edge"
export const dynamic = "force-dynamic"

/** Simpan daftar kelas yang diampu guru (disimpan di Drive, bukan database). */
export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const asal = new URL("/nilai", request.url)
  if (!user) return NextResponse.redirect(new URL("/login", request.url), 303)

  const akun = await ambilAkun(user.id)
  if (!akun || akun.role !== "guru") return NextResponse.redirect(asal, 303)

  const form = await request.formData()
  const kelas = form.getAll("kelas").map((k) => String(k)).filter(Boolean)
  try {
    await simpanKelasGuru(akun.username ?? akun.id, kelas)
    asal.searchParams.set("ok", "kelas")
  } catch (e) {
    asal.searchParams.set("e", (e as Error).message)
  }
  return NextResponse.redirect(asal, 303)
}
