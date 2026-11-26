import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { ambilAkun } from "@/lib/lms"

export const runtime = "edge"
export const dynamic = "force-dynamic"

/** Endpoint bantu diagnosa: apakah cookie sesi terbaca di server. */
export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ login: false })
    }
    const akun = await ambilAkun(user.id)
    return NextResponse.json({
      login: true,
      role: akun?.role ?? null,
      nama: akun?.nama ?? null,
      sekolah_id: akun?.sekolah_id ?? null,
      nis: akun?.nis ?? null,
    })
  } catch (e) {
    return NextResponse.json({ login: false, error: (e as Error).message }, { status: 500 })
  }
}
