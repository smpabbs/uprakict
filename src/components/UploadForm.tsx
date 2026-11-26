"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"

export default function UploadForm({ maksMb, tutup }: { maksMb: number; tutup: string }) {
  const [file, setFile] = useState<File | null>(null)
  const [progress, setProgress] = useState(0)
  const [pesan, setPesan] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [kirim, setKirim] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  const pilih = (f: File | null) => {
    setError(null)
    setPesan(null)
    if (!f) return setFile(null)
    if (f.size > maksMb * 1024 * 1024) {
      setFile(null)
      setError(`Berkas ${(f.size / 1048576).toFixed(1)} MB melebihi batas ${maksMb} MB.`)
      return
    }
    setFile(f)
  }

  const unggah = () => {
    if (!file) return
    setKirim(true)
    setError(null)
    setPesan(null)
    setProgress(0)

    const fd = new FormData()
    fd.append("berkas", file)
    const xhr = new XMLHttpRequest()
    xhr.open("POST", "/api/unggah")
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      setKirim(false)
      let j: any = {}
      try { j = JSON.parse(xhr.responseText) } catch { /* abaikan */ }
      if (xhr.status >= 200 && xhr.status < 300 && j.ok) {
        setPesan(`Berkas terkirim: ${j.nama}`)
        setFile(null)
        if (inputRef.current) inputRef.current.value = ""
        router.refresh()
      } else {
        setError(j.error ?? `Gagal mengunggah (kode ${xhr.status}).`)
      }
    }
    xhr.onerror = () => { setKirim(false); setError("Koneksi terputus saat mengunggah.") }
    xhr.send(fd)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-dashed p-6 text-center space-y-3">
        <input
          ref={inputRef}
          type="file"
          onChange={(e) => pilih(e.target.files?.[0] ?? null)}
          className="block w-full text-sm file:mr-3 file:px-3 file:py-2 file:rounded-md file:border-0 file:bg-primary file:text-primary-foreground"
          accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.rar,.jpg,.jpeg,.png,.mp4,.txt"
        />
        <p className="text-xs text-muted-foreground">
          Maksimal {maksMb} MB. PDF, dokumen, gambar, arsip, atau video pendek.
          {tutup ? ` Batas pengumpulan: ${tutup}.` : ""}
        </p>
      </div>

      {file && (
        <p className="text-sm">
          Dipilih: <strong className="break-all">{file.name}</strong> ({(file.size / 1048576).toFixed(2)} MB)
        </p>
      )}

      {kirim && (
        <div className="space-y-1">
          <div className="h-2 bg-muted rounded overflow-hidden">
            <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-xs text-muted-foreground">Mengunggah… {progress}%</p>
        </div>
      )}

      {pesan && <div className="text-sm bg-emerald-50 text-emerald-700 p-3 rounded-md">{pesan}</div>}
      {error && <div className="text-sm bg-destructive/10 text-destructive p-3 rounded-md">{error}</div>}

      <button
        type="button"
        onClick={unggah}
        disabled={!file || kirim}
        className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium disabled:opacity-50"
      >
        {kirim ? "Mengunggah…" : "Unggah ke Google Drive"}
      </button>
    </div>
  )
}
