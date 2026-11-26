import { createClient } from '@supabase/supabase-js'
import { SUPABASE_URL } from '../env'

export function getServiceSupabase() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY belum diisi di .env (server only).')
  }
  return createClient(SUPABASE_URL, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}
