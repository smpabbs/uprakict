import { NextResponse } from "next/server"
import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { cookies } from "next/headers"
import { ambilAkun } from "@/lib/lms"
import { MAKS_BYTE, MAKS_MB, UJIAN } from "@/lib/env"
import { namaSekolah, simpanPengumpulan } from "@/lib/ujian"

export const runtime = "edge"

export async function POST(request: Request) {
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(_n: string, _v: string, _o: CookieOptions) {},
        remove(_n: string, _o: CookieOptions) {},
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: "Sesi habis, silakan masuk ulang." }, { status: 401 })

  const akun = await ambilAkun(user.id)
  if (!akun) return NextResponse.json({ error: "Profil LMS tidak ditemukan." }, { status: 403 })
  if (akun.role !== "siswa") return NextResponse.json({ error: "Hanya siswa yang mengumpulkan." }, { status: 403 })
  if (UJIAN.tutup && new Date(UJIAN.tutup) < new Date()) {
    return NextResponse.json({ error: "Batas pengumpulan sudah lewat." }, { status: 403 })
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 })
  }

  const berkas = form.get("berkas")
  if (!(berkas instanceof File)) {
    return NextResponse.json({ error: "Berkas belum dipilih." }, { status: 400 })
  }
  if (berkas.size === 0) return NextResponse.json({ error: "Berkas kosong." }, { status: 400 })
  if (berkas.size > MAKS_BYTE) {
    return NextResponse.json({ error: `Berkas melebihi batas ${MAKS_MB} MB.` }, { status: 400 })
  }

  try {
    const sekolah = await namaSekolah(akun.sekolah_id)
    const hasil = await simpanPengumpulan(akun, sekolah, {
      nama: berkas.name,
      mime: berkas.type,
      bytes: await berkas.arrayBuffer(),
    })
    return NextResponse.json({ ok: true, nama: hasil.name, id: hasil.id, link: hasil.webViewLink })
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 })
  }
}
