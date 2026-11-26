"use client"

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import type { Pengumpulan, UjianTahun } from '@/lib/types'

interface SiswaRow {
  id: string
  nis: string
  nama: string
  pengumpulan: Pengumpulan | null
}

export default async function GuruHasilPage({
  params,
}: {
  params: Promise<{ tahunId: string }>
}) {
  const { profile } = useAuth()
  const [tahun, setTahun] = useState<UjianTahun | null>(null)
  const [rows, setRows] = useState<SiswaRow[] | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const { tahunId } = await params

  useEffect(() => {
    if (!profile) return
    let mounted = true
    ;(async () => {
      const [tRes, sRes] = await Promise.all([
        fetch(`/api/ujian/${tahunId}`).then((r) => r.json()),
        fetch(`/api/ujian/${tahunId}/submissions`).then((r) => r.json()),
      ])
      if (!mounted) return
      if (tRes.error) { setErr(tRes.error); return }
      if (sRes.error) { setErr(sRes.error); return }
      setTahun(tRes as UjianTahun)
      setRows(sRes as SiswaRow[])
    })()
    return () => { mounted = false }
  }, [profile, tahunId])

  if (!tahun || !rows) return <div className="text-muted-foreground">Memuat…</div>
  if (err) return <div className="text-destructive">{err}</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Hasil Pengumpulan</h1>
          <p className="text-muted-foreground">{tahun.nama}</p>
        </div>
        <a href="/" className="text-sm hover:text-primary">← Kembali</a>
      </div>

      <div className="rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted text-muted-foreground">
              <th className="px-4 py-3 text-left">NIS</th>
              <th className="px-4 py-3 text-left">Nama</th>
              <th className="px-4 py-3 text-left">File</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-left">Nilai</th>
              <th className="px-4 py-3 text-left">Aksi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b hover:bg-muted/50">
                <td className="px-4 py-3 font-mono">{r.nis}</td>
                <td className="px-4 py-3">{r.nama}</td>
                <td className="px-4 py-3">
                  {r.pengumpulan ? (
                    <a
                      href={r.pengumpulan.google_drive_web_view_link ?? '#'}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline text-sm truncate max-w-[200px] inline-block"
                    >
                      {r.pengumpulan.file_name}
                    </a>
                  ) : (
                    <span className="text-muted-foreground italic">Belum kumpulkan</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {r.pengumpulan ? (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                      Terkumpul
                    </span>
                  ) : (
                    <span className="text-xs text-muted-foreground">Belum</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {r.pengumpulan?.nilai !== null ? (
                    <span className="font-medium">{r.pengumpulan!.nilai}</span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {r.pengumpulan ? (
                    <a
                      href={`/(app)/guru/nilai/${r.pengumpulan.id}`}
                      className="text-sm text-primary hover:underline"
                    >
                      Nilai / Feedback
                    </a>
                  ) : (
                    <span className="text-sm text-muted-foreground">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
