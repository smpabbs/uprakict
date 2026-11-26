import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase/service'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tahunId: string }> }
) {
  const { tahunId } = await params

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

  const { data: prof } = await getServiceSupabase()
    .from('profiles')
    .select('role, sekolah_id')
    .eq('id', user.id)
    .maybeSingle()

  let query = getServiceSupabase()
    .from('ujian_praktik_pengumpulan')
    .select('*, profiles(id, nis, nama)')
    .eq('tahun_id', tahunId)

  if (prof?.role !== 'guru') {
    query = query.eq('student_id', user.id)
  }

  const { data, error } = await query.order('submitted_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = (data || []).map((d: any) => ({
    id: d.profiles.id,
    nis: d.profiles.nis,
    nama: d.profiles.nama,
    pengumpulan: d,
  }))

  return NextResponse.json(rows)
}
