"use server"

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getServiceSupabase } from '@/lib/supabase/service'
import { SEKOLAH_ID } from '@/lib/env'

interface LoginState {
  error?: string
}

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const role = String(formData.get("role") ?? "siswa")
  const identifier = String(formData.get("identifier") ?? "").trim()
  const password = String(formData.get("password") ?? "")

  if (!identifier || !password) {
    return { error: "Isi NIS/username dan kata sandi." }
  }

  const supabase = await createClient()

  let email: string | null = null
  if (role === "guru") {
    const { data, error } = await getServiceSupabase()
      .rpc("get_email_by_username", { p_username: identifier })
    if (error) return { error: "Tidak dapat memeriksa username. Coba lagi." }
    email = (data as string | null) ?? null
  } else {
    const { data, error } = await getServiceSupabase()
      .rpc("get_email_by_nis", { p_nis: identifier, p_sekolah_id: SEKOLAH_ID })
    if (error) return { error: "Tidak dapat memeriksa NIS. Coba lagi." }
    email = (data as string | null) ?? null
  }

  if (!email) {
    return {
      error:
        role === "guru"
          ? "Username tidak ditemukan."
          : "NIS tidak ditemukan di sekolah ini.",
    }
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  if (signInError) {
    return { error: "NIS/username atau kata sandi salah." }
  }

  redirect("/")
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect("/login")
}
