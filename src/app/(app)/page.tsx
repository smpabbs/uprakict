"use client"

import { useEffect, useState } from 'react'
import { useAuth } from '@/lib/auth'
import { supabase } from '@/lib/supabase'
import type { UjianTahun } from '@/lib/types'

export default function DashboardPage() {
  const { profile, loading } = useAuth()
  const [ujian, setUjian] = useState<UjianTahun[] | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!profile) return
    let mounted = true
    ;(async () => {
      const { data, error } = await supabase
        .from('ujian_praktik_tahun')
        .select('*')
        .order('created_at', { ascending: false })
      if (!mounted) return
      if (error) {
        setErr('Gagal memuat daftar ujian: ' + error.message)
        return
      }
      setUjian(data as UjianTahun[])
    })()
    return () => { mounted = false }
  }, [profile])

  if (loading) return <div className="text-muted-foreground">Memuat…</div>
  if (err) return <div className="text-destructive">{err}</div>
  if (!profile) return null

  const isGuru = profile.role === 'guru'

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Beranda</h1>
          <p className="text-muted-foreground">
            Halo, {profile.nama} ({profile.role === 'guru' ? 'Guru' : 'Siswa'})
          </p>
        </div>
      </div>

      {err ? (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          {err}
        </div>
      ) : ujian === null ? (
        <div className="text-muted-foreground">Memuat daftar ujian…</div>
      ) : ujian.length === 0 ? (
        <div className="rounded-lg border p-8 text-center text-muted-foreground">
          Belum ada ujian praktik yang tersedia untuk sekolah Anda.
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {ujian.map((t) => (
            <div key={t.id} className="rounded-xl border p-5 hover:shadow-md transition">
              <div className="flex items-start justify-between mb-2">
                <span className="text-xs font-medium bg-primary/10 text-primary rounded px-2 py-1">
                  {t.tahun_ajaran} · Semester {t.semester}
                </span>
              </div>
              <h2 className="text-lg font-semibold mb-1">{t.nama}</h2>
              <p className="text-sm text-muted-foreground mb-4">{t.deskripsi ?? '-'}</p>
              <div className="flex gap-2">
                {t.tutup_pada ? (
                  <span className="text-xs text-muted-foreground">
                    Tutup: {new Date(t.tutup_pada).toLocaleDateString('id-ID')}
                  </span>
                ) : null}
                {profile.role === 'siswa' ? (
                  <a
                    href={`/(app)/ujian/${t.id}`}
                    className="mt-3 inline-flex items-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium hover:bg-primary/90"
                  >
                    Kumpulkan File
                  </a>
                ) : (
                  <a
                    href={`/(app)/guru/hasil/${t.id}`}
                    className="mt-3 inline-flex items-center gap-2 px-3 py-2 border rounded-md text-sm font-medium hover:bg-muted"
                  >
                    Lihat Hasil
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
