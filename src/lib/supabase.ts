import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL, SUPABASE_ANON_KEY } from './env'

const url = SUPABASE_URL
const key = SUPABASE_ANON_KEY

if (!url || !key) {
  throw new Error('Variabel VITE/NEXT_PUBLIC_SUPABASE_URL / ANON_KEY belum diisi. Salin .env.example menjadi .env lalu isi.')
}

export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
})
