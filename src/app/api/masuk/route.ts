import { NextResponse } from "next/server"
import { cookies } from "next/headers"
import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { anon } from "@/lib/supabase/anon"
import { ambilAkun, cariStaff } from "@/lib/lms"
import { LMS_URL, LMS_ANON, SEKOLAH_DEFAULT } from "@/lib/env"

export const runtime = "edge"
export const dynamic = "force-dynamic"

/** Login manual (POST form biasa) — tidak bergantung pada JS/server action. */
export async function POST(request: Request) {
  const form = await request.formData()
  const role = String(form.get("role") ?? "siswa")
  const identifier = String(form.get("identifier") ?? "").trim()
  const password = String(form.get("password") ?? "")
  const sekolah = String(form.get("sekolah") ?? "") || SEKOLAH_DEFAULT

  const balik = (pesan: string) =>
    NextResponse.redirect(new URL("/login?e=" + encodeURIComponent(pesan), request.url), 303)

  if (!identifier || !password) return balik("Isi NIS/username dan kata sandi.")

  let email: string | null = null
  try {
    if (role === "guru") {
      // guru lewat RPC LMS; admin/auditor lewat pencarian staf (read-only)
      const { data } = await anon.rpc("get_email_by_username", { p_username: identifier })
      email = (data as string | null) ?? null
      if (!email) {
        const staf = await cariStaff(identifier)
        email = staf?.email ?? null
      }
    } else {
      const { data, error } = await anon.rpc("get_email_by_nis", { p_nis: identifier, p_sekolah_id: sekolah })
      if (error) return balik("Tidak dapat memeriksa NIS: " + error.message)
      email = (data as string | null) ?? null
    }
  } catch (e) {
    return balik("Gagal menghubungi LMS: " + (e as Error).message)
  }

  if (!email) {
    return balik(
      role === "guru" ? "Username guru tidak ditemukan di LMS." : "NIS tidak ditemukan di sekolah yang dipilih."
    )
  }

  const cookieStore = await cookies()
  const supabase = createServerClient(LMS_URL, LMS_ANON, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        cookieStore.set({ name, value, ...options })
      },
      remove(name: string, options: CookieOptions) {
        cookieStore.set({ name, value: "", ...options })
      },
    },
  })

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error || !data.user) {
    return balik("NIS/username atau kata sandi salah.")
  }

  // peran harus cocok dengan tab yang dipilih
  try {
    const akun = await ambilAkun(data.user.id)
    const staf = ["guru", "admin", "admin_keuangan", "auditor"]
    const cocok = role === "guru" ? akun && staf.includes(akun.role) : akun?.role === "siswa"
    if (akun && !cocok) {
      await supabase.auth.signOut()
      return balik(`Akun ini terdaftar sebagai ${akun.role}.`)
    }
  } catch {
    // profil tidak terbaca — login tetap lanjut
  }

  return NextResponse.redirect(new URL("/", request.url), 303)
}

export async function GET(request: Request) {
  return NextResponse.redirect(new URL("/login", request.url), 303)
}
