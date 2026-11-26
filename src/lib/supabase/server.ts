import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { LMS_URL, LMS_ANON } from '@/lib/env'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient(LMS_URL, LMS_ANON, {
    cookies: {
      get(name: string) {
        return cookieStore.get(name)?.value
      },
      set(name: string, value: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value, ...options })
        } catch {
          // dipanggil dari Server Component — abaikan
        }
      },
      remove(name: string, options: CookieOptions) {
        try {
          cookieStore.set({ name, value: '', ...options })
        } catch {
          // abaikan
        }
      },
    },
  })
}
