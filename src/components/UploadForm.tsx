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
      <div className="space-y-3 rounded-xl border border-dashed border-[#cbd5e1] bg-[#f8fafc] p-6 text-center">
        <input
          ref={inputRef}
          type="file"
          onChange={(e) => pilih(e.target.files?.[0] ?? null)}
          className="block w-full text-[13px] text-[#334155] file:mr-3 file:rounded-lg file:border-0 file:bg-[#334155] file:px-3 file:py-2 file:text-[13px] file:font-semibold file:text-white"
          accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.zip,.rar,.jpg,.jpeg,.png,.mp4,.txt"
        />
        <p className="text-[12px] text-[#5f6b7a]">
          Maksimal {maksMb} MB. PDF, dokumen, gambar, arsip, atau video pendek.
          {tutup ? ` Batas pengumpulan: ${tutup}.` : ""}
        </p>
      </div>

      {file && (
        <p className="text-[13px] text-[#334155]">
          Dipilih: <strong className="break-all text-[#0f172a]">{file.name}</strong> ({(file.size / 1048576).toFixed(2)} MB)
        </p>
      )}

      {kirim && (
        <div className="space-y-1">
          <div className="h-2 overflow-hidden rounded-full bg-[#e2e8f0]">
            <div className="h-full bg-[#115e59] transition-all" style={{ width: `${progress}%` }} />
          </div>
          <p className="text-[12px] text-[#5f6b7a]">Mengunggah… {progress}%</p>
        </div>
      )}

      {pesan && (
        <div className="rounded-lg border border-[#bbf7d0] bg-[#f0fdf4] p-3 text-[13px] text-[#15803d]">{pesan}</div>
      )}
      {error && (
        <div className="rounded-lg border border-[#fecaca] bg-[#fef2f2] p-3 text-[13px] text-[#b91c1c]">{error}</div>
      )}

      <button
        type="button"
        onClick={unggah}
        disabled={!file || kirim}
        className="rounded-lg bg-[#115e59] px-4 py-2.5 text-[13px] font-semibold text-white transition hover:bg-[#0c4a44] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {kirim ? "Mengunggah…" : "Kirim berkas"}
      </button>
    </div>
  )
}
