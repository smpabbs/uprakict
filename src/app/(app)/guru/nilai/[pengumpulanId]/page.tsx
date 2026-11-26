"use client"

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import type { Pengumpulan } from '@/lib/types'

export default async function GuruNilaiPage({
  params,
}: {
  params: Promise<{ pengumpulanId: string }>
}) {
  const { profile } = useAuth()
  const [pengumpulan, setPengumpulan] = useState<Pengumpulan & { nama: string; nis: string } | null>(null)
  const [nilai, setNilai] = useState<string>('')
  const [feedback, setFeedback] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  const { pengumpulanId } = await params

  useEffect(() => {
    if (!profile) return
    let mounted = true
    ;(async () => {
      const res = await fetch(`/api/pengumpulan/${pengumpulanId}`).then((r) => r.json())
      if (!mounted) return
      if (res.error) { setErr(res.error); return }
      setPengumpulan(res as any)
      if (res.nilai !== null) setNilai(String(res.nilai))
      if (res.feedback) setFeedback(res.feedback)
    })()
    return () => { mounted = false }
  }, [profile, pengumpulanId])

  const handleSave = async (formData: FormData) => {
    setSaving(true)
    setErr(null)
    const n = parseInt(formData.get('nilai') as string, 10)
    const fb = String(formData.get('feedback') ?? '')
    const res = await fetch(`/api/pengumpulan/${pengumpulanId}/nilai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nilai: n, feedback: fb }),
    }).then((r) => r.json())
    setSaving(false)
    if (res.error) { setErr(res.error); return }
    setOk(true)
  }

  if (!pengumpulan) return <div className="text-muted-foreground">Memuat…</div>
  if (err) return <div className="text-destructive">{err}</div>

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Input Nilai</h1>
          <p className="text-muted-foreground">
            {pengumpulan.nama} · {pengumpulan.nis}
          </p>
        </div>
        <a
          href={`/(app)/guru/hasil/${pengumpulan.tahun_id}`}
          className="text-sm hover:text-primary"
        >
          ← Kembali ke Hasil
        </a>
      </div>

      <div className="rounded-xl border p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <p className="text-sm text-muted-foreground">File</p>
            <a
              href={pengumpulan.google_drive_web_view_link ?? '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline text-sm font-medium"
            >
              {pengumpulan.file_name}
            </a>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Dikumpulkan</p>
            <p className="text-sm font-medium">
              {new Date(pengumpulan.submitted_at).toLocaleString('id-ID', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
          </div>
        </div>

        <form action={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Nilai (0-100)</label>
            <input
              name="nilai"
              type="number"
              min="0"
              max="100"
              defaultValue={nilai ? Number(nilai) : undefined}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Feedback</label>
            <textarea
              name="feedback"
              defaultValue={feedback}
              rows={4}
              className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          {ok && <div className="text-xs bg-green-100 text-green-700 px-3 py-2 rounded">Nilai tersimpan.</div>}
          {err && <div className="text-xs text-destructive">{err}</div>}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-2 bg-primary text-primary-foreground rounded-md font-medium disabled:opacity-50"
          >
            {saving ? 'Menyimpan…' : 'Simpan Nilai'}
          </button>
        </form>
      </div>
    </div>
  )
}
