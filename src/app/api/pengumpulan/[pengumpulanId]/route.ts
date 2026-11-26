import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase/service'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ pengumpulanId: string }> }
) {
  const { pengumpulanId } = await params

  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set() {},
        remove() {},
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await getServiceSupabase()
    .from('ujian_praktik_pengumpulan')
    .select('*, profiles(id, nis, nama)')
    .eq('id', pengumpulanId)
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Pengumpulan tidak ditemukan' }, { status: 404 })

  return NextResponse.json({
    ...data,
    nama: data.profiles.nama,
    nis: data.profiles.nis,
  })
}
