'use client'

import { useState, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuth } from '@/lib/auth'

interface Props {
  tahunId: string
}

export function UploadForm({ tahunId }: Props) {
  const { profile } = useAuth()
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [ok, setOk] = useState(false)

  const handleSubmit = useCallback(async (formData: FormData) => {
    if (!file) return
    setUploading(true)
    setErr(null)
    setOk(false)

    const uploadData = new FormData()
    uploadData.append('tahunId', tahunId)
    uploadData.append('file', file)

    const res = await fetch('/api/upload', {
      method: 'POST',
      body: uploadData,
    }).then((r) => r.json())

    setUploading(false)
    if (res.error) {
      setErr(res.error)
      return
    }
    setOk(true)
  }, [file, tahunId])

  if (ok) {
    return (
      <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-green-800">
        File berhasil terunggah dan tersimpan di Google Drive.
      </div>
    )
  }

  return (
    <div className="rounded-xl border p-5">
      <h2 className="text-lg font-semibold mb-4">Unggah File Ujian</h2>
      <form action={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Pilih File</label>
          <input
            type="file"
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null
              setFile(f)
              if (f && f.size > 50 * 1024 * 1024) {
                setErr('File terlalu besar (maks 50 MB)')
                setFile(null)
              } else {
                setErr(null)
              }
            }}
            className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
            accept=".pdf,.doc,.docx,.zip,.rar,.jpg,.jpeg,.png"
          />
        </div>
        {file && (
          <div className="text-sm text-muted-foreground">
            {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
          </div>
        )}
        {err && <div className="text-sm text-destructive">{err}</div>}
        <button
          type="submit"
          disabled={uploading || !file}
          className="w-full py-2 bg-primary text-primary-foreground rounded-md font-medium disabled:opacity-50"
        >
          {uploading ? 'Mengunggah…' : 'Kumpulkan File'}
        </button>
        <p className="text-xs text-muted-foreground">
          File akan disimpan di Google Drive sekolah. Maksimal 50 MB. Tipe yang diizinkan: PDF, DOC, DOCX, ZIP, RAR, JPG, PNG.
        </p>
      </form>
    </div>
  )
}
