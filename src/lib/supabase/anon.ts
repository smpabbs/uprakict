// Klien anon untuk membaca RPC publik LMS (pola forum-abbs / absensi-guru-abbs).
// Tanpa sesi, tanpa kunci service role.
import { createClient } from "@supabase/supabase-js"
import { LMS_URL, LMS_ANON } from "@/lib/env"

export const anon = createClient(LMS_URL, LMS_ANON, {
  auth: { persistSession: false, autoRefreshToken: false },
})

/** Email akun LMS untuk NIS + sekolah (RPC bawaan LMS). */
export async function emailSiswa(nis: string, sekolahId: string): Promise<string | null> {
  const { data, error } = await anon.rpc("get_email_by_nis", { p_nis: nis, p_sekolah_id: sekolahId })
  if (error) throw new Error("Tidak dapat memeriksa NIS: " + error.message)
  return (data as string | null) ?? null
}

/** Email akun LMS untuk username guru (RPC bawaan LMS). */
export async function emailGuru(username: string): Promise<string | null> {
  const { data, error } = await anon.rpc("get_email_by_username", { p_username: username })
  if (error) throw new Error("Tidak dapat memeriksa username: " + error.message)
  return (data as string | null) ?? null
}
