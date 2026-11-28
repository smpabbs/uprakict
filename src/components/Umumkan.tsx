"use client"

import { useEffect, useState } from "react"

/** Pesan (galat/info) yang diteruskan melalui query ?e= / ?ok= dari redirect POST. */
export default function Umumkan() {
  const [pesan, setPesan] = useState<{ teks: string; galat: boolean } | null>(null)

  useEffect(() => {
    const p = new URLSearchParams(window.location.search)
    const galat = p.get("e")
    const ok = p.get("ok")
    // ?ok=1 hanya penanda berhasil tanpa teks (pesan aslinya dirender halaman)
    const teks = galat ?? (ok && ok !== "1" ? ok : null)
    if (!teks) return
    setPesan({ teks, galat: Boolean(galat) })
    // bersihkan query setelah dibaca supaya tidak tampil lagi saat di-refresh;
    // dibungkus setTimeout agar tidak mengulang render saat effect masih jalan
    p.delete("e")
    p.delete("ok")
    const sisa = p.toString()
    setTimeout(() => {
      window.history.replaceState(null, "", window.location.pathname + (sisa ? "?" + sisa : ""))
    }, 0)
  }, [])

  if (!pesan) return null
  return (
    <div
      role="status"
      className={
        "fixed inset-x-3 top-3 z-50 mx-auto max-w-xl rounded-xl border px-4 py-3 text-[13px] font-medium shadow-lg " +
        (pesan.galat
          ? "border-[#e9adad] bg-[#f9dede] text-[#991b1b]"
          : "border-[#98dcb0] bg-[#dcede2] text-[#14532d]")
      }
    >
      <div className="flex items-start justify-between gap-3">
        <span>{pesan.teks}</span>
        <button
          type="button"
          onClick={() => setPesan(null)}
          aria-label="Tutup pesan"
          className="shrink-0 rounded-md px-1.5 text-[15px] leading-none opacity-70 hover:opacity-100"
        >
          ×
        </button>
      </div>
    </div>
  )
}
