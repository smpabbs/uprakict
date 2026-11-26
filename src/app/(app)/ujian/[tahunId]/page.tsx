"use client"

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { nav } from '@/lib/router'
import type { UjianTahun } from '@/lib/types'
import { UploadForm } from '@/components/UploadForm'

export default async function UjianPage({
  params,
}: {
  params: Promise<{ tahunId: string }>
}) {
  const { profile, loading } = useAuth()
  const [ujian, setUjian] = useState<UjianTahun | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const { tahunId } = await params

  useEffect(() => {
    if (!profile) return
    let mounted = true
    ;(async () => {
      const res = await fetch(`/api/ujian/${tahunId}`, {
        headers: { Accept: 'application/json' },
      })
      const json = await res.json()
      if (!mounted) return
      if (json.error) {
        setErr(json.error)
        return
      }
      setUjian(json as UjianTahun)
    })()
    return () => { mounted = false }
  }, [profile, tahunId])

  if (loading) return <div className="text-muted-foreground">Memuat…</div>
  if (err) return <div className="text-destructive">{err}</div>
  if (!ujian || !profile) return null

  const sudahTutup = ujian.tutup_pada ? new Date(ujian.tutup_pada) < new Date() : false

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{ujian.nama}</h1>
          <p className="text-muted-foreground">
            {ujian.tahun_ajaran} · Semester {ujian.semester}
          </p>
        </div>
        <a href="/" className="text-sm hover:text-primary">
          ← Kembali ke Beranda
        </a>
      </div>

      <div className="rounded-xl border p-5">
        <p className="text-muted-foreground">{ujian.deskripsi ?? '-'}</p>
        {ujian.tutup_pada && (
          <p className="text-sm text-muted-foreground mt-2">
            Batas pengumpulan:
            {new Date(ujian.tutup_pada).toLocaleString('id-ID', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        )}
        {sudahTutup && (
          <div className="mt-3 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-destructive text-sm">
            Pengumpulan sudah ditutup.
          </div>
        )}
      </div>

      {!sudahTutup && <UploadForm tahunId={tahunId} />}
    </div>
  )
}
