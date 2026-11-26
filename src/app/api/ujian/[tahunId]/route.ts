import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase/service'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ tahunId: string }> }
) {
  const { tahunId } = await params
  const { data, error } = await getServiceSupabase()
    .from('ujian_praktik_tahun')
    .select('*')
    .eq('id', tahunId)
    .maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!data) return NextResponse.json({ error: 'Ujian tidak ditemukan' }, { status: 404 })
  return NextResponse.json(data)
}
