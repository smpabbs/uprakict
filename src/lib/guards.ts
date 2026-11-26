import { createClient } from './supabase/server'
import { Profile } from './types'

export async function ambilProfile(): Promise<Profile | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()
  return (data as Profile) ?? null
}

export async function isGuru(): Promise<boolean> {
  const p = await ambilProfile()
  return p?.role === 'guru'
}

export async function sekolahSaya(): Promise<string | null> {
  const p = await ambilProfile()
  return p ? p.id : null // sekolah_id disimpan di profiles, tapi kita pakai nis scope lewat RLS
}
