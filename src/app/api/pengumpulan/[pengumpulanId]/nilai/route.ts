import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase/service'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function POST(
  request: Request,
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

  const { data: prof } = await getServiceSupabase()
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  if (prof?.role !== 'guru') {
    return NextResponse.json({ error: 'Hanya guru yang dapat memberi nilai' }, { status: 403 })
  }

  const body = await request.json()
  const nilai = Number(body.nilai)
  const feedback = String(body.feedback ?? '')

  if (isNaN(nilai) || nilai < 0 || nilai > 100) {
    return NextResponse.json({ error: 'Nilai harus antara 0 dan 100' }, { status: 400 })
  }

  const { error } = await getServiceSupabase()
    .from('ujian_praktik_pengumpulan')
    .update({ nilai, feedback, nilai_oleh: user.id, nilai_pada: new Date().toISOString() })
    .eq('id', pengumpulanId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
