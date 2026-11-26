"use server"

import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { emailGuru, emailSiswa } from "@/lib/supabase/anon"
import { ambilAkun } from "@/lib/lms"
import { SEKOLAH_DEFAULT } from "@/lib/env"

export interface LoginState {
  error?: string
}

/**
 * Login memakai akun LMS Al Abidin (pola sama dengan forum-abbs & absensi-guru-abbs):
 * - siswa → NIS + kata sandi (RPC get_email_by_nis, wajib sekolah_id)
 * - guru  → username + kata sandi (RPC get_email_by_username)
 * Tidak ada data yang ditulis ke database LMS.
 */
export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const role = String(formData.get("role") ?? "siswa")
  const identifier = String(formData.get("identifier") ?? "").trim()
  const password = String(formData.get("password") ?? "")
  const sekolah = String(formData.get("sekolah") ?? "") || SEKOLAH_DEFAULT

  if (!identifier || !password) {
    return { error: "Isi NIS/username dan kata sandi." }
  }

  let email: string | null = null
  try {
    email = role === "guru" ? await emailGuru(identifier) : await emailSiswa(identifier, sekolah)
  } catch (e) {
    return { error: (e as Error).message }
  }

  if (!email) {
    return {
      error:
        role === "guru"
          ? "Username guru tidak ditemukan di LMS."
          : "NIS tidak ditemukan di sekolah yang dipilih.",
    }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error || !data.user) {
    return { error: "NIS/username atau kata sandi salah." }
  }

  // pastikan tab yang dipilih cocok dengan peran akun di LMS
  try {
    const akun = await ambilAkun(data.user.id)
    if (akun && akun.role !== role) {
      await supabase.auth.signOut()
      return { error: "Akun ini terdaftar sebagai " + akun.role + ", bukan " + role + "." }
    }
  } catch {
    // profil tidak terbaca (mis. kunci service role belum diisi) — login tetap lanjut
  }

  redirect("/")
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}
