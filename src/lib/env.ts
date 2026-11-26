// Pusat pembacaan variabel lingkungan. Hanya NEXT_PUBLIC_* yang boleh ke browser.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
export const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

export const SEKOLAH_ID = process.env.NEXT_PUBLIC_SEKOLAH_ID ?? ""
export const SEKOLAH_NAMA = process.env.NEXT_PUBLIC_SEKOLAH_NAMA ?? "Sekolah"

export const GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON =
  process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON ?? ""
export const GOOGLE_DRIVE_ROOT_FOLDER_ID =
  process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID ?? ""
