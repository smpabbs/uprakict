import { NextResponse } from 'next/server'
import { getServiceSupabase } from '@/lib/supabase/service'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { google } from 'googleapis'

export async function POST(request: Request) {
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

  const formData = await request.formData()
  const tahunId = formData.get('tahunId') as string
  const file = formData.get('file') as File
  if (!tahunId || !file) {
    return NextResponse.json({ error: 'Data tidak lengkap' }, { status: 400 })
  }
  if (file.size > 50 * 1024 * 1024) {
    return NextResponse.json({ error: 'File terlalu besar (maks 50 MB)' }, { status: 400 })
  }

  const { data: ujian } = await getServiceSupabase()
    .from('ujian_praktik_tahun')
    .select('*')
    .eq('id', tahunId)
    .maybeSingle()
  if (!ujian) return NextResponse.json({ error: 'Ujian tidak ditemukan' }, { status: 404 })

  let drive
  try {
    const creds = JSON.parse(process.env.GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON!)
    const auth = new google.auth.GoogleAuth({
      credentials: creds,
      scopes: ['https://www.googleapis.com/auth/drive.file'],
    })
    drive = google.drive({ version: 'v3', auth })
  } catch {
    return NextResponse.json({ error: 'Konfigurasi Google Drive tidak valid' }, { status: 500 })
  }

  const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID
  if (!rootFolderId) {
    return NextResponse.json({ error: 'Folder root Google Drive belum dikonfigurasi' }, { status: 500 })
  }

  const [sekolahFolder] = await ensureFolder(drive, rootFolderId, 'Ujian Praktik ICT')
  const [tahunFolder] = await ensureFolder(
    drive,
    sekolahFolder,
    `${ujian.tahun_ajaran} Semester ${ujian.semester}`
  )
  const [siswaFolder] = await ensureFolder(drive, tahunFolder, user.id)

  const buffer = Buffer.from(await file.arrayBuffer())
  const fileRes = await drive.files.create({
    requestBody: {
      name: file.name,
      parents: [siswaFolder],
    },
    media: {
      mimeType: file.type || 'application/octet-stream',
      body: buffer,
    },
    fields: 'id, webViewLink',
  })

  const driveFileId = fileRes.data.id
  const webViewLink = fileRes.data.webViewLink

  const { error } = await getServiceSupabase()
    .from('ujian_praktik_pengumpulan')
    .upsert(
      {
        tahun_id: tahunId,
        student_id: user.id,
        file_name: file.name,
        file_size: file.size,
        file_mime: file.type || 'application/octet-stream',
        google_drive_file_id: driveFileId,
        google_drive_web_view_link: webViewLink,
        submitted_at: new Date().toISOString(),
      },
      { onConflict: 'tahun_id,student_id' }
    )

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true, fileId: driveFileId })
}

async function ensureFolder(drive: any, parentId: string, name: string) {
  const res = await drive.files.list({
    q: `mimeType='application/vnd.google-apps.folder' and name='${name}' and '${parentId}' in parents and trashed=false`,
    fields: 'files(id, name)',
  })
  const existing = res.data.files?.[0]
  if (existing) return [existing.id, false] as [string, boolean]

  const created = await drive.files.create({
    requestBody: { name, mimeType: 'application/vnd.google-apps.folder', parents: [parentId] },
    fields: 'id',
  })
  return [created.data.id, true] as [string, boolean]
}
